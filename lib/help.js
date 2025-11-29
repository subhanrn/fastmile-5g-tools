const { colors, DEFAULT_HOSTNAME, DEFAULT_PATH } = require('./constants');

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
    ${colors.green}--wait <seconds>${colors.reset}        Wait time for reconnect (default: 1)
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

module.exports = {
    printHelp,
};
