const fs = require('fs');
const { CONFIG_FILE, colors } = require('./constants');

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
    if (args.hostname === require('./constants').DEFAULT_HOSTNAME && config.hostname) {
        args.hostname = config.hostname;
    }
    if (args.waitTime === 1 && config.waitTime) {
        args.waitTime = config.waitTime;
    }
    if (args.apn === 'internet' && config.apn) {
        args.apn = config.apn;
    }
    
    return args;
}

module.exports = {
    loadConfig,
    saveConfig,
    mergeConfigWithArgs,
};
