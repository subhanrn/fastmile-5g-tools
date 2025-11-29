#!/usr/bin/env node

const { run } = require('./lib/run');

// Run the CLI
run().catch(err => {
    const { colors } = require('./lib/constants');
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
    process.exit(1);
});
