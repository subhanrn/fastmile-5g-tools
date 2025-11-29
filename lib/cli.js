const { argv } = require('process');
const { DEFAULT_HOSTNAME, DEFAULT_PATH } = require('./constants');

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
        waitTime: 1,
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

module.exports = {
    parseArgs,
};
