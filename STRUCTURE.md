# Project Structure

The code has been refactored into a modular architecture for better maintainability.

## Directory Structure

```
fastmile-5g-tools/
├── main.js              # Entry point - handles CLI routing
├── lib/                 # Core modules
│   ├── constants.js     # Configuration constants and colors
│   ├── config.js        # Config file management
│   ├── auth.js          # Authentication and crypto functions
│   ├── api.js           # API calls (status, APN, reboot)
│   ├── formatter.js     # Output formatters (table, json, compact)
│   ├── cli.js           # Command-line argument parser
│   ├── commands.js      # Command handlers (login, status, etc.)
│   └── help.js          # Help text
├── config.json          # User configuration (gitignored)
├── package.json         # npm package configuration
└── README.md            # Main documentation
```

## Module Descriptions

### `main.js`
- Entry point for the application
- Parses CLI arguments
- Routes to appropriate command handlers
- Minimal code - just orchestration

### `lib/constants.js`
- Defines default values (hostname, paths)
- ANSI color codes for terminal output
- Central configuration constants

### `lib/config.js`
- Config file loading and saving
- Merges command-line args with saved config
- Handles config.json I/O

### `lib/auth.js`
- Authentication functions
- Crypto operations (SHA-256, base64url encoding)
- Login flow (nonce → salt → login)
- Exports high-level `authenticate()` function

### `lib/api.js`
- HTTP API calls to the gateway
- `fetchData()` - Generic HTTP GET with cookie support
- `fetchDetailedStatus()` - Get detailed gateway status
- `modifyAPN()` - Change APN configuration
- `rebootGateway()` - Reboot the device

### `lib/formatter.js`
- Output formatting functions
- `formatTable()` - Colored table output
- `formatCompact()` - Single-line compact format
- `formatJson()` - JSON output with filtering

### `lib/cli.js`
- Command-line argument parsing
- Returns structured args object
- Handles all CLI flags and options

### `lib/commands.js`
- Command handler functions
- `handleStatus()` - Show gateway status (with auto-auth)
- `handleLogin()` - Authenticate and save credentials
- `handleConfig()` - Display saved configuration
- `handleReconnect()` - Reconnect interface
- `handleRestart()` - Reboot gateway

### `lib/help.js`
- Help text and usage examples
- Keeps help documentation separate from logic

## Benefits of This Structure

1. **Modularity**: Each file has a single responsibility
2. **Maintainability**: Easy to find and modify specific features
3. **Testability**: Functions can be tested independently
4. **Readability**: Smaller files are easier to understand
5. **Reusability**: Modules can be imported into other scripts
6. **Scalability**: Easy to add new commands or features

## Adding New Features

### Add a new command:
1. Add command handler to `lib/commands.js`
2. Add command case to `main.js` switch statement
3. Update help text in `lib/help.js`

### Add a new API endpoint:
1. Add function to `lib/api.js`
2. Use it in appropriate command handler

### Add a new output format:
1. Add formatter function to `lib/formatter.js`
2. Update command handlers to support it

## Migration Notes

The old monolithic `main.js` (904 lines) has been backed up to `main-old.js`.
The new structure splits functionality into 8 focused modules totaling ~600 lines with better organization.

All functionality remains the same - this is a pure refactor with no breaking changes.
