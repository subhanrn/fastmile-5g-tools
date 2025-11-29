const path = require('path');

// CLI Configuration
const DEFAULT_HOSTNAME = '192.168.1.1';
const DEFAULT_PATH = '/prelogin_status_web_app.cgi';
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

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

module.exports = {
    DEFAULT_HOSTNAME,
    DEFAULT_PATH,
    CONFIG_FILE,
    colors,
};
