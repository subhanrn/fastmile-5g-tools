# Quick Start Guide

## First Time Setup

### Step 1: Save Your Credentials

Instead of typing your username and password every time, save them once:

```bash
node main.js login -u admin -p your_password --save-config
```

This will:
- Test your credentials
- Save them to `config.json`
- Show your session information

### Step 2: Verify Saved Configuration

```bash
node main.js config
```

You should see:
```
Saved Configuration (config.json):

Username: admin
Password: ********
Hostname: 192.168.1.1
Wait Time: 1 seconds
```

### Step 3: Use Without Credentials

Now you can run commands without typing credentials:

```bash
# Check status
node main.js

# Force reconnection
node main.js reconnect

# Watch mode
node main.js status --watch
```

## Common Workflows

### Daily Monitoring

```bash
# Quick status check
node main.js

# Watch 5G signal continuously
node main.js status --filter 5g --watch --interval 10
```

### Connection Issues

```bash
# Force reconnection (uses saved credentials)
node main.js reconnect

# Custom wait time
node main.js reconnect --wait 45
```

### Different Gateway

```bash
# Override saved hostname
node main.js reconnect --host 192.168.1.1
```

## Configuration File Location

The `config.json` file is saved in the same directory as `main.js`:
- Windows: `D:\path\to\fastmile-5g-tools\config.json`
- Linux/Mac: `/path/to/fastmile-5g-tools/config.json`

## Manual Configuration

You can also create `config.json` manually:

```json
{
  "username": "admin",
  "password": "your_password",
  "hostname": "192.168.1.1",
  "waitTime": 1
}
```

## Security Tips

1. **File Permissions**: On Linux/Mac, protect your config file:
   ```bash
   chmod 600 config.json
   ```

2. **Don't Commit**: The `.gitignore` file is already configured to exclude `config.json`

3. **Backup**: Keep a secure backup of your credentials elsewhere

4. **Override**: Command line arguments always override saved config:
   ```bash
   node main.js reconnect -u different_user -p different_pass
   ```

## Troubleshooting

### Config Not Loading

If your saved credentials aren't working:

1. Check config file exists:
   ```bash
   # Windows
   dir config.json
   
   # Linux/Mac
   ls -la config.json
   ```

2. View config:
   ```bash
   node main.js config
   ```

3. Re-save credentials:
   ```bash
   node main.js login -u admin -p password --save-config
   ```

### Password Changed

If you changed your gateway password:

```bash
# Login with new password and save
node main.js login -u admin -p new_password --save-config
```

This will overwrite the old config.
