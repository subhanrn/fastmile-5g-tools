#!/usr/bin/env node

const { parseArgs } = require('./lib/cli');
const { mergeConfigWithArgs } = require('./lib/config');
const { printHelp } = require('./lib/help');
const {
    handleLogin,
    handleConfig,
    handleReconnect,
    handleRestart,
    handleStatus,
} = require('./lib/commands');

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
            await handleStatus(args);
            break;
    }
}

// Run the CLI
main().catch(err => {
    const { colors } = require('./lib/constants');
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
    process.exit(1);
});
