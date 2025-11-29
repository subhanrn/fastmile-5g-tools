#!/usr/bin/env node

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { argv } = require('process');

// CLI Configuration
const DEFAULT_HOSTNAME = '192.168.8.1';
const DEFAULT_PATH = '/prelogin_status_web_app.cgi';
const CONFIG_FILE = path.join(__dirname, 'config.json');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

// ============================================
// Config File Management
// ============================================

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`${colors.yellow}Warning: Could not load config file: ${error.message}${colors.reset}`);
    }
    return {};
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`${colors.red}Error: Could not save config file: ${error.message}${colors.reset}`);
        return false;
    }
}

function mergeConfigWithArgs(args) {
    const config = loadConfig();
    
    // Only use config values if not provided via command line
    if (!args.username && config.username) {
        args.username = config.username;
    }
    if (!args.password && config.password) {
        args.password = config.password;
    }
    if (args.hostname === DEFAULT_HOSTNAME && config.hostname) {
        args.hostname = config.hostname;
    }
    if (args.waitTime === 10 && config.waitTime) {
        args.waitTime = config.waitTime;
    }
    if (args.apn === 'internet' && config.apn) {
        args.apn = config.apn;
    }
    
    return args;
}

// ============================================
// Authentication & Crypto Functions
// ============================================

function sha256(val1, val2) {
    const hash = crypto.createHash('sha256');
    hash.update(`${val1}:${val2}`);
    return hash.digest('base64');
}

function sha256url(val1, val2) {
    return base64url_escape(sha256(val1, val2));
}

function sha256String(val) {
    const hash = crypto.createHash('sha256');
    hash.update(val);
    return hash.digest('hex');
}

function base64url_escape(b64) {
    let out = '';
    for (let i = 0; i < b64.length; i++) {
        const c = b64.charAt(i);
        if (c === '+') out += '-';
        else if (c === '/') out += '_';
        else if (c === '=') out += '.';
        else out += c;
    }
    return out;
}

function getResult(options, result, resolve, reject) {
    let rawData = '';
    result.on('data', chunk => rawData += chunk);
    result.on('end', () => resolve(rawData));
    result.on('error', error => reject(error));
}

function getNonce(hostname) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path: '/login_web_app.cgi?nonce',
            method: 'GET',
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.end();
    });
}

function getSalt(hostname, username, nonceResponse) {
    return new Promise((resolve, reject) => {
        const nonceUrl = base64url_escape(nonceResponse.nonce);
        const userHash = sha256url(username, nonceResponse.nonce);
        const postBody = `userhash=${userHash}&nonce=${nonceUrl}`;
        const options = {
            hostname,
            path: '/login_web_app.cgi?salt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postBody),
            },
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

function performLogin(hostname, username, password, nonceResponse, saltResponse) {
    return new Promise((resolve, reject) => {
        const nonceUrl = base64url_escape(nonceResponse.nonce);
        const userhash = sha256url(username, nonceResponse.nonce);
        const randomKeyHash = sha256url(nonceResponse.randomKey, nonceResponse.nonce);
        
        let hashedPassword = nonceResponse.iterations >= 1
            ? sha256String(saltResponse.alati + password)
            : saltResponse.alati + password;

        for (let i = 1; i < nonceResponse.iterations; i++) {
            hashedPassword = sha256String(hashedPassword);
        }

        const response = sha256url(sha256(username, hashedPassword.toLowerCase()), nonceResponse.nonce);
        
        // Generate random encryption key and IV
        const enckey = crypto.randomBytes(16).toString('base64');
        const enciv = crypto.randomBytes(16).toString('base64');
        
        let postBody = `userhash=${userhash}&RandomKeyhash=${randomKeyHash}&response=${response}&nonce=${nonceUrl}`;
        postBody += `&enckey=${base64url_escape(enckey)}&enciv=${base64url_escape(enciv)}`;

        const options = {
            hostname,
            path: '/login_web_app.cgi?salt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postBody),
            },
        };
        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(postBody);
        req.end();
    });
}

function modifyAPN(hostname, loginResponse, enableInternet, apnName = 'internet') {
    return new Promise((resolve, reject) => {
        const apnPayload = JSON.stringify({
            version: 1,
            csrf_token: loginResponse.token,
            id: 1,
            interface: "Nokia.GenericService",
            service: "OAM",
            function: "ModifyAPN",
            paralist: [{
                WorkMode: "RouteMode",
                AccessPointName: apnName,
                Services: enableInternet ? "TR069,INTERNET" : "TR069",
                VOIP: null,
                INTERNET: enableInternet,
                IPTV: false,
                UserName: "",
                Password: "",
                confirmPwd: null,
                AuthenticationMode: "None",
                IPv4: true,
                IPv6: true,
                IPv4NetMask: "",
                MTUSize: "",
                APNInstanceID: 1,
                ipMode: 3,
                mtuMode: "Automatic",
                EthernetInterface: "",
                VLANID: 0
            }]
        });

        const options = {
            hostname,
            path: '/service_function_web_app.cgi',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(apnPayload),
                Cookie: `sid=${loginResponse.sid}`,
            },
        };

        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(apnPayload);
        req.end();
    });
}

function rebootGateway(hostname, loginResponse) {
    return new Promise((resolve, reject) => {
        const rebootPayload = JSON.stringify({
            version: 1,
            csrf_token: loginResponse.token,
            id: 1,
            interface: "Nokia.GenericService",
            service: "OAM",
            function: "Reboot",
            paralist: []
        });
        
        const options = {
            hostname,
            path: '/reboot_web_app.cgi',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(rebootPayload),
                Cookie: `sid=${loginResponse.sid}`,
            },
        };

        const req = http.request(options, result => getResult(options, result, resolve, reject));
        req.on('error', reject);
        req.write(rebootPayload);
        req.end();
    });
}

// ============================================
// CLI Argument Parsing
// ============================================

function parseArgs() {
    const args = {
        command: 'status', // status, login, reconnect, restart, config
        hostname: DEFAULT_HOSTNAME,
        path: DEFAULT_PATH,
        format: 'table', // table, json, compact
        filter: null, // wan, 5g, lte, all
        watch: false,
        interval: 5000,
        help: false,
        username: '',
        password: '',
        waitTime: 10,
        apn: 'internet',
        saveConfig: false,
        showConfig: false,
    };

    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        
        if (arg === '-h' || arg === '--help') {
            args.help = true;
        } else if (arg === 'status') {
            args.command = 'status';
        } else if (arg === 'login') {
            args.command = 'login';
        } else if (arg === 'reconnect') {
            args.command = 'reconnect';
        } else if (arg === 'restart' || arg === 'reboot') {
            args.command = 'restart';
        } else if (arg === 'config') {
            args.command = 'config';
            args.showConfig = true;
        } else if (arg === '--save-config' || arg === '-s') {
            args.saveConfig = true;
        } else if (arg === '--host' && i + 1 < argv.length) {
            args.hostname = argv[++i];
        } else if (arg === '--path' && i + 1 < argv.length) {
            args.path = argv[++i];
        } else if (arg === '-u' || arg === '--username') {
            if (i + 1 < argv.length) {
                args.username = argv[++i];
            }
        } else if (arg === '-p' || arg === '--password') {
            if (i + 1 < argv.length) {
                args.password = argv[++i];
            }
        } else if (arg === '--wait') {
            if (i + 1 < argv.length) {
                args.waitTime = parseInt(argv[++i]);
            }
        } else if (arg === '--apn') {
            if (i + 1 < argv.length) {
                args.apn = argv[++i];
            }
        } else if (arg === '-f' || arg === '--format') {
            if (i + 1 < argv.length) {
                args.format = argv[++i];
            }
        } else if (arg === '--filter' && i + 1 < argv.length) {
            args.filter = argv[++i].toLowerCase();
        } else if (arg === '-w' || arg === '--watch') {
            args.watch = true;
        } else if (arg === '-i' || arg === '--interval') {
            if (i + 1 < argv.length) {
                args.interval = parseInt(argv[++i]) * 1000;
            }
        }
    }

    return args;
}

function printHelp() {
    console.log(`
${colors.bright}${colors.cyan}FastMile 5G Tools${colors.reset} - Monitor and manage your 5G gateway

${colors.bright}USAGE:${colors.reset}
    node main.js [COMMAND] [OPTIONS]

${colors.bright}COMMANDS:${colors.reset}
    ${colors.green}status${colors.reset}                 Show gateway status (default)
    ${colors.green}login${colors.reset}                  Authenticate and get session token
    ${colors.green}reconnect${colors.reset}              Force interface reconnection (requires auth)
    ${colors.green}restart${colors.reset}                Reboot the gateway (requires auth)
    ${colors.green}config${colors.reset}                 Show saved configuration

${colors.bright}OPTIONS:${colors.reset}
    ${colors.green}--host <hostname>${colors.reset}       Gateway hostname/IP (default: ${DEFAULT_HOSTNAME})
    ${colors.green}--path <path>${colors.reset}           API endpoint path (default: ${DEFAULT_PATH})
    ${colors.green}-u, --username <user>${colors.reset}   Username for authentication
    ${colors.green}-p, --password <pass>${colors.reset}   Password for authentication
    ${colors.green}-s, --save-config${colors.reset}       Save credentials to config.json
    ${colors.green}--apn <name>${colors.reset}            Access Point Name (default: internet)
    ${colors.green}--wait <seconds>${colors.reset}        Wait time for reconnect (default: 10)
    ${colors.green}-f, --format <type>${colors.reset}     Output format: table, json, compact (default: table)
    ${colors.green}--filter <section>${colors.reset}      Filter output: wan, 5g, lte, all (default: all)
    ${colors.green}-w, --watch${colors.reset}             Watch mode - continuously update
    ${colors.green}-i, --interval <sec>${colors.reset}    Watch interval in seconds (default: 5)
    ${colors.green}-h, --help${colors.reset}              Show this help message

${colors.bright}EXAMPLES:${colors.reset}
    ${colors.yellow}# Show status${colors.reset}
    node main.js
    node main.js status --format json
    node main.js status --filter 5g --watch
    
    ${colors.yellow}# Save credentials to config${colors.reset}
    node main.js login -u admin -p password --save-config
    
    ${colors.yellow}# Use saved credentials${colors.reset}
    node main.js reconnect
    
    ${colors.yellow}# Restart gateway${colors.reset}
    node main.js restart
    
    ${colors.yellow}# View saved config${colors.reset}
    node main.js config
    
    ${colors.yellow}# Override saved config${colors.reset}
    node main.js reconnect -u different_user -p different_pass
`);
}

function formatTable(json, filter) {
    let output = '';

    // WAN IP Status
    if (!filter || filter === 'all' || filter === 'wan') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         WAN IP Status                 ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.wan_ip_status && json.wan_ip_status.length > 0) {
            const wan = json.wan_ip_status[0];
            const status = wan.gwwanup === 1 ? `${colors.green}UP${colors.reset}` : `${colors.red}DOWN${colors.reset}`;
            output += `  ${colors.yellow}Status:${colors.reset}       ${status}\n`;
            output += `  ${colors.yellow}IPv4:${colors.reset}         ${wan.ExternalIPAddress || 'N/A'}\n`;
            output += `  ${colors.yellow}IPv6:${colors.reset}         ${wan.ExternalIPv6Address || 'N/A'}\n`;
        } else {
            output += `  ${colors.red}No WAN IP status found.${colors.reset}\n`;
        }
        output += '\n';
    }

    // 5G Cell Stats
    if (!filter || filter === 'all' || filter === '5g') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         5G Cell Stats                 ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.cell_5G_stats_cfg && json.cell_5G_stats_cfg.length > 0) {
            const stat = json.cell_5G_stats_cfg[0].stat;
            const signalLevel = getSignalQuality(stat.SignalStrengthLevel);
            output += `  ${colors.yellow}RSRP:${colors.reset}         ${stat.RSRPCurrent} dBm\n`;
            output += `  ${colors.yellow}RSRQ:${colors.reset}         ${stat.RSRQCurrent} dB\n`;
            output += `  ${colors.yellow}SNR:${colors.reset}          ${stat.SNRCurrent} dB\n`;
            output += `  ${colors.yellow}Signal:${colors.reset}       ${signalLevel} (Level ${stat.SignalStrengthLevel})\n`;
        } else {
            output += `  ${colors.red}No 5G stats available.${colors.reset}\n`;
        }
        output += '\n';
    }

    // LTE Cell Stats
    if (!filter || filter === 'all' || filter === 'lte') {
        output += `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}║         LTE Cell Stats                ║${colors.reset}\n`;
        output += `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`;
        
        if (json.cell_LTE_stats_cfg && json.cell_LTE_stats_cfg.length > 0) {
            const stat = json.cell_LTE_stats_cfg[0].stat;
            const signalLevel = getSignalQuality(stat.SignalStrengthLevel);
            output += `  ${colors.yellow}RSRP:${colors.reset}         ${stat.RSRPCurrent} dBm\n`;
            output += `  ${colors.yellow}RSRQ:${colors.reset}         ${stat.RSRQCurrent} dB\n`;
            output += `  ${colors.yellow}RSSI:${colors.reset}         ${stat.RSSICurrent} dBm\n`;
            output += `  ${colors.yellow}SNR:${colors.reset}          ${stat.SNRCurrent} dB\n`;
            output += `  ${colors.yellow}Signal:${colors.reset}       ${signalLevel} (Level ${stat.SignalStrengthLevel})\n`;
        } else {
            output += `  ${colors.red}No LTE stats available.${colors.reset}\n`;
        }
    }

    return output;
}

function formatCompact(json, filter) {
    let output = '';

    if (!filter || filter === 'all' || filter === 'wan') {
        if (json.wan_ip_status && json.wan_ip_status.length > 0) {
            const wan = json.wan_ip_status[0];
            output += `WAN: ${wan.gwwanup === 1 ? 'UP' : 'DOWN'} | IPv4: ${wan.ExternalIPAddress || 'N/A'} | `;
        }
    }

    if (!filter || filter === 'all' || filter === '5g') {
        if (json.cell_5G_stats_cfg && json.cell_5G_stats_cfg.length > 0) {
            const stat = json.cell_5G_stats_cfg[0].stat;
            output += `5G: RSRP=${stat.RSRPCurrent} RSRQ=${stat.RSRQCurrent} SNR=${stat.SNRCurrent} | `;
        }
    }

    if (!filter || filter === 'all' || filter === 'lte') {
        if (json.cell_LTE_stats_cfg && json.cell_LTE_stats_cfg.length > 0) {
            const stat = json.cell_LTE_stats_cfg[0].stat;
            output += `LTE: RSRP=${stat.RSRPCurrent} RSRQ=${stat.RSRQCurrent} SNR=${stat.SNRCurrent}`;
        }
    }

    return output;
}

function formatJson(json, filter) {
    let filtered = {};

    if (!filter || filter === 'all') {
        filtered = json;
    } else {
        if (filter === 'wan') {
            filtered.wan_ip_status = json.wan_ip_status;
        } else if (filter === '5g') {
            filtered.cell_5G_stats_cfg = json.cell_5G_stats_cfg;
        } else if (filter === 'lte') {
            filtered.cell_LTE_stats_cfg = json.cell_LTE_stats_cfg;
        }
    }

    return JSON.stringify(filtered, null, 2);
}

function getSignalQuality(level) {
    const levelNum = parseInt(level);
    if (levelNum >= 4) return `${colors.green}Excellent${colors.reset}`;
    if (levelNum === 3) return `${colors.green}Good${colors.reset}`;
    if (levelNum === 2) return `${colors.yellow}Fair${colors.reset}`;
    if (levelNum === 1) return `${colors.red}Poor${colors.reset}`;
    return `${colors.red}No Signal${colors.reset}`;
}

function fetchData(hostname, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method: 'GET',
            timeout: 5000,
        };

        const req = http.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${err.message}`));
                }
            });
        });

        req.on('error', err => {
            reject(new Error(`Request failed: ${err.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function displayData(args) {
    try {
        const json = await fetchData(args.hostname, args.path);
        
        let output;
        if (args.format === 'json') {
            output = formatJson(json, args.filter);
        } else if (args.format === 'compact') {
            output = formatCompact(json, args.filter);
        } else {
            output = formatTable(json, args.filter);
        }

        if (args.watch) {
            console.clear();
            console.log(`${colors.bright}Last updated: ${new Date().toLocaleTimeString()}${colors.reset}\n`);
        }

        console.log(output);
    } catch (err) {
        console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
        if (!args.watch) {
            process.exit(1);
        }
    }
}

async function handleLogin(args) {
    if (!args.username || !args.password) {
        console.error(`${colors.red}Error: Username and password are required for login${colors.reset}`);
        console.log(`${colors.yellow}Usage: node main.js login -u <username> -p <password>${colors.reset}`);
        process.exit(1);
    }

    try {
        console.log(`${colors.cyan}Connecting to ${args.hostname}...${colors.reset}`);
        
        // Step 1: Get nonce
        console.log('Getting nonce...');
        const nonceData = await getNonce(args.hostname);
        const nonceResponse = JSON.parse(nonceData);
        
        // Step 2: Get salt
        console.log('Getting salt...');
        const saltData = await getSalt(args.hostname, args.username, nonceResponse);
        const saltResponse = JSON.parse(saltData);
        
        // Step 3: Login
        console.log('Authenticating...');
        const loginData = await performLogin(args.hostname, args.username, args.password, nonceResponse, saltResponse);
        const loginResponse = JSON.parse(loginData);
        
        if (loginResponse.sid) {
            console.log(`${colors.green}✓ Login successful!${colors.reset}`);
            console.log(`${colors.yellow}Session ID:${colors.reset} ${loginResponse.sid}`);
            console.log(`${colors.yellow}Token:${colors.reset} ${loginResponse.token}`);
            
            // Save config if requested
            if (args.saveConfig) {
                const config = {
                    username: args.username,
                    password: args.password,
                    hostname: args.hostname,
                    waitTime: args.waitTime,
                    apn: args.apn
                };
                if (saveConfig(config)) {
                    console.log(`${colors.green}✓ Credentials saved to config.json${colors.reset}`);
                } else {
                    console.log(`${colors.red}✗ Failed to save credentials${colors.reset}`);
                }
            }
        } else {
            console.error(`${colors.red}✗ Login failed${colors.reset}`);
            console.log(loginData);
        }
    } catch (error) {
        console.error(`${colors.red}Login error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

function handleConfig() {
    const config = loadConfig();
    
    if (Object.keys(config).length === 0) {
        console.log(`${colors.yellow}No configuration file found.${colors.reset}`);
        console.log(`${colors.cyan}To save credentials, use:${colors.reset}`);
        console.log(`  node main.js login -u <username> -p <password> --save-config`);
        return;
    }
    
    console.log(`${colors.bright}${colors.cyan}Saved Configuration (${CONFIG_FILE}):${colors.reset}\n`);
    console.log(`${colors.yellow}Username:${colors.reset} ${config.username || 'Not set'}`);
    console.log(`${colors.yellow}Password:${colors.reset} ${config.password ? '********' : 'Not set'}`);
    console.log(`${colors.yellow}Hostname:${colors.reset} ${config.hostname || 'Not set'}`);
    console.log(`${colors.yellow}Wait Time:${colors.reset} ${config.waitTime || 10} seconds`);
    console.log(`${colors.yellow}APN:${colors.reset} ${config.apn || 'internet'}`);
    console.log(`\n${colors.cyan}To update, use --save-config flag with login command${colors.reset}`);
}

async function handleReconnect(args) {
    if (!args.username || !args.password) {
        console.error(`${colors.red}Error: Username and password are required for reconnect${colors.reset}`);
        console.log(`${colors.yellow}Usage: node main.js reconnect -u <username> -p <password>${colors.reset}`);
        console.log(`${colors.yellow}Or save credentials first: node main.js login -u <username> -p <password> --save-config${colors.reset}`);
        process.exit(1);
    }

    try {
        console.log(`${colors.cyan}Starting reconnection process...${colors.reset}\n`);
        
        // Login
        console.log('Step 1: Authenticating...');
        const nonceData = await getNonce(args.hostname);
        const nonceResponse = JSON.parse(nonceData);
        
        const saltData = await getSalt(args.hostname, args.username, nonceResponse);
        const saltResponse = JSON.parse(saltData);
        
        const loginData = await performLogin(args.hostname, args.username, args.password, nonceResponse, saltResponse);
        const loginResponse = JSON.parse(loginData);
        
        if (!loginResponse.sid) {
            throw new Error('Authentication failed');
        }
        console.log(`${colors.green}✓ Authenticated${colors.reset}\n`);
        
        // Bring interface down
        console.log('Step 2: Bringing interface down...');
        await modifyAPN(args.hostname, loginResponse, false, args.apn);
        console.log(`${colors.green}✓ Interface down${colors.reset}\n`);
        
        // Wait
        console.log(`Step 3: Waiting ${args.waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, args.waitTime * 1000));
        console.log(`${colors.green}✓ Wait complete${colors.reset}\n`);
        
        // Bring interface up
        console.log('Step 4: Bringing interface up...');
        const upResponse = await modifyAPN(args.hostname, loginResponse, true, args.apn);
        console.log(`${colors.green}✓ Interface up${colors.reset}\n`);
        
        console.log(`${colors.bright}${colors.green}Reconnection successful!${colors.reset}`);
        
        if (args.format === 'json') {
            console.log('\nResponse:', upResponse);
        }
    } catch (error) {
        console.error(`${colors.red}Reconnect error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

async function handleRestart(args) {
    if (!args.username || !args.password) {
        console.error(`${colors.red}Error: Username and password are required for restart${colors.reset}`);
        console.log(`${colors.yellow}Usage: node main.js restart -u <username> -p <password>${colors.reset}`);
        console.log(`${colors.yellow}Or save credentials first: node main.js login -u <username> -p <password> --save-config${colors.reset}`);
        process.exit(1);
    }

    try {
        console.log(`${colors.cyan}Starting gateway restart...${colors.reset}\n`);
        
        // Login
        console.log('Step 1: Authenticating...');
        const nonceData = await getNonce(args.hostname);
        const nonceResponse = JSON.parse(nonceData);
        
        const saltData = await getSalt(args.hostname, args.username, nonceResponse);
        const saltResponse = JSON.parse(saltData);
        
        const loginData = await performLogin(args.hostname, args.username, args.password, nonceResponse, saltResponse);
        const loginResponse = JSON.parse(loginData);
        
        if (!loginResponse.sid) {
            throw new Error('Authentication failed');
        }
        console.log(`${colors.green}✓ Authenticated${colors.reset}\n`);
        
        // Reboot
        console.log('Step 2: Sending reboot command...');
        await rebootGateway(args.hostname, loginResponse);
        console.log(`${colors.green}✓ Reboot command sent${colors.reset}\n`);
        
        console.log(`${colors.bright}${colors.yellow}Gateway is rebooting...${colors.reset}`);
        console.log(`${colors.cyan}This may take 1-2 minutes. The gateway will be unavailable during this time.${colors.reset}`);
    } catch (error) {
        console.error(`${colors.red}Restart error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

async function main() {
    let args = parseArgs();

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // Merge saved config with command line arguments
    // Command line args take precedence
    args = mergeConfigWithArgs(args);

    // Handle different commands
    switch (args.command) {
        case 'config':
            handleConfig();
            break;
            
        case 'login':
            await handleLogin(args);
            break;
            
        case 'reconnect':
            await handleReconnect(args);
            break;
            
        case 'restart':
            await handleRestart(args);
            break;
            
        case 'status':
        default:
            if (args.watch) {
                console.log(`${colors.bright}${colors.cyan}Starting watch mode... (Press Ctrl+C to exit)${colors.reset}\n`);
                
                // Initial display
                await displayData(args);
                
                // Set up interval
                setInterval(async () => {
                    await displayData(args);
                }, args.interval);
            } else {
                await displayData(args);
            }
            break;
    }
}


// Run the CLI
main().catch(err => {
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
    process.exit(1);
});