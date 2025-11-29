const { colors, DEFAULT_HOSTNAME, DEFAULT_PATH, CONFIG_FILE } = require('./constants');
const { saveConfig, loadConfig } = require('./config');
const { authenticate } = require('./auth');
const { fetchDetailedStatus, fetchData, modifyAPN, rebootGateway } = require('./api');
const { formatTable, formatCompact, formatJson } = require('./formatter');

async function displayData(args, cookie = null) {
    try {
        let json;
        
        // Try detailed status API first, fall back to old API if it fails
        try {
            json = await fetchDetailedStatus(args.hostname, cookie);
        } catch (detailedError) {
            // Fall back to old API
            json = await fetchData(args.hostname, args.path, cookie);
        }
        
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
        console.log('Authenticating...');
        
        const loginResponse = await authenticate(args.hostname, args.username, args.password);
        
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
            
            // Display status with authenticated session
            console.log(`\n${colors.cyan}Fetching gateway status...${colors.reset}\n`);
            const cookie = `sid=${loginResponse.sid}`;
            await displayData(args, cookie);
        } else {
            console.error(`${colors.red}✗ Login failed${colors.reset}`);
            console.log(JSON.stringify(loginResponse, null, 2));
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
    console.log(`${colors.yellow}Wait Time:${colors.reset} ${config.waitTime || 1} seconds`);
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
        const loginResponse = await authenticate(args.hostname, args.username, args.password);
        
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
        
        console.log(`${colors.bright}${colors.green}Reconnection successful!${colors.reset}\n`);
        
        // Display status with authenticated session
        console.log(`${colors.cyan}Current gateway status:${colors.reset}\n`);
        const cookie = `sid=${loginResponse.sid}`;
        await displayData(args, cookie);
        
        if (args.format === 'json') {
            console.log('\nReconnect Response:', upResponse);
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
        const loginResponse = await authenticate(args.hostname, args.username, args.password);
        
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

async function handleStatus(args) {
    // Try to authenticate if credentials are available
    let cookie = null;
    if (args.username && args.password) {
        try {
            const loginResponse = await authenticate(args.hostname, args.username, args.password);
            
            if (loginResponse.sid) {
                cookie = `sid=${loginResponse.sid}`;
            }
        } catch (error) {
            // Silently fall back to unauthenticated request
        }
    }
    
    if (args.watch) {
        console.log(`${colors.bright}${colors.cyan}Starting watch mode... (Press Ctrl+C to exit)${colors.reset}\n`);
        
        // Initial display
        await displayData(args, cookie);
        
        // Set up interval
        setInterval(async () => {
            await displayData(args, cookie);
        }, args.interval);
    } else {
        await displayData(args, cookie);
    }
}

module.exports = {
    handleLogin,
    handleConfig,
    handleReconnect,
    handleRestart,
    handleStatus,
};
