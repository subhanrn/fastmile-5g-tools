const { parseArgs } = require('./cli');
const { mergeConfigWithArgs } = require('./config');
const { printHelp } = require('./help');
const {
    handleLogin,
    handleConfig,
    handleReconnect,
    handleRestart,
    handleStatus,
} = require('./commands');

async function run() {
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

module.exports = {
    run,
};