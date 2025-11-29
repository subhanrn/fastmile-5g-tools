# FastMile 5G Tools

A comprehensive command-line interface (CLI) tool to monitor and manage your FastMile 5G gateway including status monitoring, authentication, and interface control (reconnection).

## Features

- 📊 **Multiple Output Formats**: Table (default), JSON, or compact format
- 🎯 **Filtering**: View specific sections (WAN, 5G, or LTE)
- 👀 **Watch Mode**: Continuously monitor with auto-refresh
- 🔐 **Authentication**: Login to gateway with secure hashing
- 💾 **Config File**: Save credentials for easy reuse
- 🔄 **Interface Control**: Force interface reconnection
- 🔃 **Gateway Restart**: Reboot the gateway remotely
- 🎨 **Colored Output**: Easy-to-read colored terminal output
- ⚙️ **Configurable**: Custom hostname, intervals, and more
- 🔧 **Pure Node.js**: No external crypto dependencies

## Installation

### Local Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Run the tool directly with Node.js:

```bash
node main.js
```

### Global Installation (Optional)

To install globally and use as a command:

```bash
npm install -g .
```

Then you can run:

```bash
fastmile
```

## Usage

### Commands

The tool supports five main commands:

#### 1. Status (Default)
Monitor gateway status including WAN, 5G, and LTE statistics.

```bash
node main.js status
# or simply
node main.js
```

#### 2. Login
Authenticate with the gateway to obtain session credentials.

```bash
node main.js login -u admin -p password
```

#### 3. Reconnect
Force a complete interface reconnection (requires authentication).

```bash
node main.js reconnect -u admin -p password
```

#### 4. Restart
Reboot the gateway remotely (requires authentication).

```bash
node main.js restart -u admin -p password
# or with saved credentials
node main.js restart
```

#### 5. Config
Display saved configuration from `config.json`.

```bash
node main.js config
```

### Configuration File

Save your credentials to avoid typing them every time:

```bash
# Save credentials during login
node main.js login -u admin -p password --save-config

# Now you can use commands without credentials
node main.js reconnect
```

The config file (`config.json`) stores:
- Username
- Password
- Hostname
- Wait time (for reconnect)
- APN (Access Point Name)

**Security Note**: The config file contains plain text credentials. Make sure to:
- Keep `config.json` secure (it's in `.gitignore` by default)
- Set appropriate file permissions: `chmod 600 config.json` (Linux/Mac)
- Don't commit it to version control

You can also manually create/edit `config.json`:
```json
{
  "username": "admin",
  "password": "your_password",
  "hostname": "192.168.1.1",
  "waitTime": 1,
  "apn": "internet"
}
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host <hostname>` | Gateway hostname/IP | 192.168.1.1 |
| `--path <path>` | API endpoint path | /prelogin_status_web_app.cgi |
| `-u, --username <user>` | Username for authentication | - |
| `-p, --password <pass>` | Password for authentication | - |
| `-s, --save-config` | Save credentials to config.json | false |
| `--apn <name>` | Access Point Name | internet |
| `--wait <seconds>` | Wait time during reconnect | 1 |
| `-f, --format <type>` | Output format: table, json, compact | table |
| `--filter <section>` | Filter output: wan, 5g, lte, all | all |
| `-w, --watch` | Enable watch mode (continuous updates) | false |
| `-i, --interval <sec>` | Watch interval in seconds | 5 |
| `-h, --help` | Show help message | - |

### Examples

#### Configuration Management

**Save credentials:**
```bash
node main.js login -u admin -p password --save-config
```

**View saved configuration:**
```bash
node main.js config
```

**Use saved credentials:**
```bash
# Reconnect uses saved credentials automatically
node main.js reconnect

# Or override saved credentials
node main.js reconnect -u different_user -p different_pass
```

#### Status Monitoring

**Default table view:**
```bash
node main.js
```

**JSON output:**
```bash
node main.js status --format json
```

**View only 5G stats:**
```bash
node main.js status --filter 5g
```

**Watch mode with 10-second intervals:**
```bash
node main.js status --watch --interval 10
```

**Compact format for scripting:**
```bash
node main.js status --format compact
```

#### Authentication & Management

**Login and save credentials:**
```bash
node main.js login --host 192.168.1.1 -u admin -p yourpassword --save-config
```

**Login without saving:**
```bash
node main.js login --host 192.168.1.1 -u admin -p yourpassword
```

**Force interface reconnection (with saved config):**
```bash
node main.js reconnect
```

**Reconnect with manual credentials:**
```bash
node main.js reconnect -u admin -p yourpassword
```

**Reconnect with custom wait time (45 seconds):**
```bash
node main.js reconnect --wait 45
```

**Reconnect on different gateway:**
```bash
node main.js reconnect --host 192.168.1.1 -u admin -p yourpassword
```

**Use custom APN:**
```bash
# Save custom APN to config
node main.js login -u admin -p password --apn myapn --save-config

# Or use it directly
node main.js reconnect --apn custom_apn_name
```

**Restart gateway:**
```bash
# Restart with saved credentials
node main.js restart

# Restart with manual credentials
node main.js restart -u admin -p password
```

## Output Formats

### Table Format (Default)

Displays a nicely formatted table with colored output:
```
╔═══════════════════════════════════════╗
║         WAN IP Status                 ║
╚═══════════════════════════════════════╝
  Status:       UP
  IPv4:         xxx.xxx.xxx.xxx
  IPv6:         xxxx:xxxx:xxxx::xxxx

╔═══════════════════════════════════════╗
║         5G Cell Stats                 ║
╚═══════════════════════════════════════╝
  RSRP:         -85 dBm
  RSRQ:         -12 dB
  SNR:          15 dB
  Signal:       Good (Level 3)
```

### JSON Format

Outputs raw JSON data for parsing:
```json
{
  "wan_ip_status": [...],
  "cell_5G_stats_cfg": [...],
  "cell_LTE_stats_cfg": [...]
}
```

### Compact Format

Single-line output ideal for scripts or logging:
```
WAN: UP | IPv4: xxx.xxx.xxx.xxx | 5G: RSRP=-85 RSRQ=-12 SNR=15 | LTE: RSRP=-90 RSRQ=-10 SNR=12
```

## Signal Quality Indicators

The tool interprets signal strength levels:

- **Level 4+**: Excellent (Green)
- **Level 3**: Good (Green)
- **Level 2**: Fair (Yellow)
- **Level 1**: Poor (Red)
- **Level 0**: No Signal (Red)

## Requirements

- Node.js 12.0.0 or higher
- Network access to your FastMile gateway
- Gateway admin credentials (for login/reconnect commands)

## How It Works

### Authentication Process

The tool implements Nokia's secure authentication mechanism:

1. **Nonce Request**: Obtains a random nonce from the gateway
2. **Salt Request**: Retrieves password salt using hashed username
3. **Login**: Performs authentication with iterative SHA-256 hashing
4. **Session**: Receives session ID and CSRF token for API calls

All crypto operations use Node.js built-in `crypto` module (no external dependencies).

### Reconnection Process

The reconnect command performs a full interface reset:

1. Authenticates with the gateway
2. Disables the internet interface
3. Waits for specified duration (default 1 seconds)
4. Re-enables the internet interface
5. Confirms successful reconnection

This is useful for:
- Forcing a new IP address assignment
- Recovering from connection issues
- Testing network resilience

## Troubleshooting

**Authentication failed:**
```bash
# Verify credentials
node main.js login -u admin -p password --host 192.168.1.1
```

**Connection timeout:**
```bash
# Check network connectivity and gateway address
ping 192.168.1.1
```

**Different gateway address:**
```bash
# Use the --host option with your gateway's IP
node main.js --host 192.168.1.1
```

**Reconnect takes too long:**
```bash
# Reduce wait time
node main.js reconnect -u admin -p password --wait 15
```

## License

MIT

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.
