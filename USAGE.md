# Quick Usage Guide

## Common Commands

### Monitor Status

```bash
# Basic status check
node main.js

# Watch mode (updates every 5 seconds)
node main.js status --watch

# Custom interval (every 10 seconds)
node main.js status --watch --interval 10

# JSON output (for scripting)
node main.js status --format json

# View only 5G stats
node main.js status --filter 5g

# View only LTE stats
node main.js status --filter lte

# Compact one-line output
node main.js status --format compact
```

### Authentication

```bash
# Login to gateway
node main.js login -u admin -p yourpassword

# Login to different host
node main.js login --host 192.168.1.1 -u admin -p yourpassword
```

### Force Reconnection

```bash
# Standard reconnection (1 second wait)
node main.js reconnect -u admin -p yourpassword

# Quick reconnection (15 second wait)
node main.js reconnect -u admin -p yourpassword --wait 15

# Longer wait (60 seconds)
node main.js reconnect -u admin -p yourpassword --wait 60

# Reconnect different host
node main.js reconnect --host 192.168.1.1 -u admin -p yourpassword
```

## Scripting Examples

### Monitor Signal Quality

```bash
# Check 5G signal every 30 seconds and log to file
while true; do
  node main.js status --filter 5g --format compact >> signal_log.txt
  sleep 30
done
```

### Auto-Reconnect on Poor Signal

```bash
# Check signal and reconnect if RSRP is poor
rsrp=$(node main.js status --filter 5g --format json | grep RSRPCurrent | cut -d':' -f2 | tr -d ' ",')
if [ "$rsrp" -lt "-100" ]; then
  echo "Poor signal detected, reconnecting..."
  node main.js reconnect -u admin -p yourpassword
fi
```

### Schedule Regular Status Checks

```bash
# Add to crontab for hourly status checks
# 0 * * * * cd /path/to/fastmile-5g-tools && node main.js status --format compact >> /var/log/5g_status.log
```

## Tips

1. **Save Credentials**: Create a simple wrapper script:
   ```bash
   #!/bin/bash
   USER="admin"
   PASS="yourpassword"
   HOST="192.168.1.1"
   
   node main.js "$@" --host "$HOST" -u "$USER" -p "$PASS"
   ```

2. **Watch Multiple Metrics**: Open multiple terminals with different filters
   ```bash
   # Terminal 1
   node main.js status --filter wan --watch
   
   # Terminal 2
   node main.js status --filter 5g --watch
   ```

3. **JSON Processing**: Use `jq` for advanced filtering
   ```bash
   node main.js status --format json | jq '.cell_5G_stats_cfg[0].stat'
   ```

4. **Quick Reconnect Alias**: Add to your `.bashrc` or `.profile`
   ```bash
   alias 5g-reconnect='node /path/to/main.js reconnect -u admin -p yourpass'
   alias 5g-status='node /path/to/main.js status'
   ```
