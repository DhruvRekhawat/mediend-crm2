# Cron Job Setup for MySQL Lead Sync

This guide explains how to set up automated syncing of leads from MySQL to PostgreSQL using cron-job.org.

## Overview

The sync runs via an API endpoint that can be triggered by cron-job.org every 10 minutes. This approach is preferred for production as it:
- ✅ Works from anywhere (no server-side cron needed)
- ✅ Provides automatic monitoring and retry logic
- ✅ Sends email notifications on failures
- ✅ Has built-in execution history and logging

## API Endpoint

**Endpoint**: `https://workspace.mediend.com/api/sync/mysql-leads`  
**Method**: `POST`  
**Authentication**: Bearer token (API key)

## Prerequisites

1. ✅ API endpoint is deployed and accessible
2. ✅ Environment variable `LEADS_API_SECRET` or `SYNC_API_SECRET` is set
3. ✅ MySQL connection is configured (`MYSQL_SOURCE_URL`)
4. ✅ Database migrations are complete

## Setup Steps

### 1. Generate API Secret

Add to your `.env` file (if not already set):
```env
LEADS_API_SECRET=your_secure_random_string_here_min_32_chars
# OR use separate secret for sync
SYNC_API_SECRET=your_sync_specific_secret_here
```

Generate a secure random string:
```bash
# On Linux/Mac
openssl rand -hex 32

# On Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### 2. Verify API Endpoint

Test the endpoint manually:
```bash
curl -X POST https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json"
```

Or check status:
```bash
curl -X GET https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

### 3. Set Up on cron-job.org

1. **Create Account**
   - Go to https://cron-job.org
   - Sign up for a free account (or login if you have one)

2. **Create New Cron Job**
   - Click "Create cronjob" button
   - Fill in the details:

   **Title**: `MySQL Lead Sync`
   
   **Address (URL)**: 
   ```
   https://workspace.mediend.com/api/sync/mysql-leads
   ```
   
   **Schedule**: 
   - Select "Every X minutes"
   - Enter `10` minutes
   - Or use custom cron: `*/10 * * * *`
   
   **Request method**: `POST`
   
   **Request headers**:
   ```
   Authorization: Bearer YOUR_API_SECRET_HERE
   Content-Type: application/json
   ```
   
   **Status**: `Enabled`
   
   **Notifications**:
   - ✅ Enable email notifications
   - Set email for failure alerts
   - Optionally enable success notifications (for monitoring)

3. **Advanced Settings** (Optional)
   - **Timeout**: Set to 9 minutes (cron-job.org has 10 min limit)
   - **Retry on failure**: Enable (recommended: 2-3 retries)
   - **Timezone**: Set to your server timezone

4. **Save and Test**
   - Click "Create cronjob"
   - Click "Test now" to verify it works
   - Check execution logs to confirm successful sync

## API Response Format

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "message": "Sync completed successfully",
    "lastSyncedDate": "2024-12-31T10:30:00.000Z",
    "lastSyncedId": 12345,
    "processed": 150,
    "synced": 100,
    "updated": 50,
    "errors": 0,
    "executionTimeMs": 45000
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Monitoring

### Check Sync Status

Use the GET endpoint to check last sync:
```bash
curl -X GET https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Sync status retrieved",
    "lastSyncedDate": "2024-12-31T10:30:00.000Z",
    "lastSyncedId": 12345,
    "recordsCount": 5000,
    "lastRunAt": "2024-12-31T10:40:00.000Z",
    "mysqlConnected": true
  }
}
```

### cron-job.org Dashboard

- View execution history in cron-job.org dashboard
- Check execution logs for each run
- Monitor success/failure rates
- Set up additional alert channels (Slack, Discord, etc.)

## Troubleshooting

### API Returns 401 Unauthorized
- ✅ Check `LEADS_API_SECRET` or `SYNC_API_SECRET` is set in environment
- ✅ Verify Bearer token in cron-job.org matches the secret exactly
- ✅ Ensure no extra spaces in the Authorization header

### API Returns 500 Error
- ✅ Check application logs for detailed error messages
- ✅ Verify MySQL connection (`MYSQL_SOURCE_URL` is correct)
- ✅ Ensure database is accessible and migrations are run
- ✅ Check if BD users exist (auto-creation should handle this)

### Sync Timeout
- ✅ The API has a 9-minute timeout to prevent cron-job.org timeout
- ✅ If sync takes longer, it will stop at safe point and resume next run
- ✅ Check execution time in response `executionTimeMs`

### No Leads Being Synced
- ✅ Check `lastSyncedDate` in status response
- ✅ Verify there are leads in MySQL with `Lead_Date >= lastSyncedDate`
- ✅ Check MySQL connection is working

## Alternative: Manual Trigger

You can also trigger the sync manually:
```bash
# Using curl
curl -X POST https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json"

# Using PowerShell
Invoke-RestMethod -Uri "https://workspace.mediend.com/api/sync/mysql-leads" \
  -Method POST \
  -Headers @{
    "Authorization" = "Bearer YOUR_API_SECRET"
    "Content-Type" = "application/json"
  }
```

## Security Best Practices

1. **Use Strong API Secrets**
   - Minimum 32 characters
   - Mix of letters, numbers, and special characters
   - Never commit secrets to git

2. **Rotate Secrets Periodically**
   - Update `LEADS_API_SECRET` in environment
   - Update cron-job.org header
   - Old requests will fail (good for security)

3. **Monitor Failed Attempts**
   - Check cron-job.org logs for unauthorized attempts
   - Set up alerts for multiple failures
   - Review execution patterns

4. **HTTPS Only**
   - Always use `https://` in cron-job.org
   - Never use `http://` (secrets sent in plaintext)

## Cost Considerations

- **cron-job.org Free Tier**: 
  - Up to 2 cron jobs
  - 1 minute minimum interval
  - Basic monitoring
  
- **cron-job.org Paid Tier** (if needed):
  - Unlimited cron jobs
  - 1 second minimum interval
  - Advanced monitoring and alerts

## Windows Setup (Task Scheduler)

### Option 1: Using Task Scheduler GUI

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter
   - Or search "Task Scheduler" in Start menu

2. **Create Basic Task**
   - Click "Create Basic Task" in the right panel
   - Name: `MySQL Lead Sync`
   - Description: `Sync leads from MySQL to PostgreSQL every 10 minutes`

3. **Set Trigger**
   - Trigger: `Daily`
   - Start date: Today
   - Recur every: `1 days`
   - Click "Advanced settings"
   - Check "Repeat task every: `10 minutes`"
   - Duration: `Indefinitely` (or set end date)

4. **Set Action**
   - Action: `Start a program`
   - Program/script: `npm` (or full path: `C:\Program Files\nodejs\npm.cmd`)
   - Add arguments: `run sync:leads`
   - Start in: `C:\Users\DHRUV\OneDrive\Desktop\mediend-crm-v2`

5. **Additional Settings**
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Configure for: `Windows 10` (or your version)

6. **Save**
   - Click Finish
   - Enter your Windows password when prompted

### Option 2: Using PowerShell (Recommended)

Create a PowerShell script to set up the task:

```powershell
# Run PowerShell as Administrator
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run sync:leads" -WorkingDirectory "C:\Users\DHRUV\OneDrive\Desktop\mediend-crm-v2"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 9999)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "MySQL Lead Sync" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Sync leads from MySQL to PostgreSQL every 10 minutes"
```

### Option 3: Using Node.js Script Wrapper

For better error handling and logging, create a wrapper script:

**File: `scripts/sync-leads-cron.js`** (or `.ts`)

```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');
const logFile = path.join(logDir, 'sync-leads.log');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(logMessage.trim());
};

log('Starting scheduled lead sync...');

const child = exec('npm run sync:leads', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
  if (error) {
    log(`ERROR: ${error.message}`);
    process.exit(1);
  }
  
  if (stdout) log(stdout);
  if (stderr) log(`STDERR: ${stderr}`);
  
  log('Scheduled lead sync completed');
  process.exit(0);
});

child.stdout.on('data', (data) => log(data.toString().trim()));
child.stderr.on('data', (data) => log(`ERROR: ${data.toString().trim()}`));
```

Then update Task Scheduler to run: `node scripts/sync-leads-cron.js`

## Linux/Production Setup (Cron)

### 1. Create Logs Directory

```bash
mkdir -p /path/to/mediend-crm-v2/logs
```

### 2. Create Cron Entry

Edit crontab:
```bash
crontab -e
```

Add this line to run every 10 minutes:
```cron
*/10 * * * * cd /path/to/mediend-crm-v2 && /usr/bin/npm run sync:leads >> logs/sync-leads.log 2>&1
```

Or if using Bun:
```cron
*/10 * * * * cd /path/to/mediend-crm-v2 && /usr/local/bin/bun run sync:leads >> logs/sync-leads.log 2>&1
```

### 3. Cron with Better Error Handling

Create a wrapper script for better control:

**File: `scripts/sync-leads-wrapper.sh`**

```bash
#!/bin/bash

# Set working directory
cd /path/to/mediend-crm-v2

# Load environment variables
source .env 2>/dev/null || true

# Set log file
LOG_FILE="logs/sync-leads.log"
ERROR_LOG="logs/sync-leads-error.log"

# Ensure logs directory exists
mkdir -p logs

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to log errors
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$ERROR_LOG"
    log "ERROR: $1"
}

# Start sync
log "Starting scheduled lead sync..."

# Run sync and capture output
if npm run sync:leads >> "$LOG_FILE" 2>> "$ERROR_LOG"; then
    log "Lead sync completed successfully"
    exit 0
else
    log_error "Lead sync failed - check error log"
    # Optional: Send alert email or notification
    # mail -s "MySQL Lead Sync Failed" admin@example.com < "$ERROR_LOG"
    exit 1
fi
```

Make it executable:
```bash
chmod +x scripts/sync-leads-wrapper.sh
```

Update crontab:
```cron
*/10 * * * * /path/to/mediend-crm-v2/scripts/sync-leads-wrapper.sh
```

### 4. Prevent Overlapping Syncs

To prevent multiple syncs from running simultaneously:

**File: `scripts/sync-leads-wrapper.sh`** (enhanced version)

```bash
#!/bin/bash

cd /path/to/mediend-crm-v2
LOCK_FILE="logs/sync-leads.lock"
LOG_FILE="logs/sync-leads.log"

mkdir -p logs

# Check if sync is already running
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync already running (PID: $PID), skipping" >> "$LOG_FILE"
        exit 0
    else
        # Stale lock file, remove it
        rm -f "$LOCK_FILE"
    fi
fi

# Create lock file
echo $$ > "$LOCK_FILE"

# Ensure lock file is removed on exit
trap "rm -f $LOCK_FILE" EXIT INT TERM

# Load environment and run sync
source .env 2>/dev/null || true
npm run sync:leads >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync completed successfully" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

exit $EXIT_CODE
```

## Verification

### Check if Cron is Running (Linux)

```bash
# Check cron logs
tail -f logs/sync-leads.log

# Check if cron job is scheduled
crontab -l

# Check cron service status
systemctl status cron  # Ubuntu/Debian
systemctl status crond  # CentOS/RHEL
```

### Check Task Scheduler (Windows)

```powershell
# List all scheduled tasks
Get-ScheduledTask | Where-Object {$_.TaskName -like "*Lead*"}

# Check task status
Get-ScheduledTask -TaskName "MySQL Lead Sync"

# View task history
Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational | Where-Object {$_.Message -like "*MySQL Lead Sync*"}
```

## Testing

Before setting up cron, test the command manually:

```bash
# Test sync command
npm run sync:leads

# Check logs
tail -f logs/sync-leads.log
```

## Log Rotation (Linux)

To prevent log files from growing too large, set up log rotation:

**File: `/etc/logrotate.d/mediend-sync`**

```
/path/to/mediend-crm-v2/logs/sync-leads.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 user user
}

/path/to/mediend-crm-v2/logs/sync-leads-error.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 user user
}
```

## Troubleshooting

### Cron not running?
- Check cron service: `systemctl status cron`
- Check cron logs: `grep CRON /var/log/syslog`
- Verify PATH in cron: Add `PATH=/usr/local/bin:/usr/bin:/bin` to crontab
- Check file permissions: Scripts must be executable

### Environment variables not loaded?
- Use absolute paths in cron
- Source `.env` file in wrapper script
- Or set variables directly in crontab (less secure)

### Sync taking too long?
- If sync takes >10 minutes, consider:
  - Increasing batch size
  - Running less frequently (every 15-30 minutes)
  - Using lock file to prevent overlaps

### Windows Task Scheduler not running?
- Check task is enabled: Task Scheduler → MySQL Lead Sync → Properties → General → Enabled
- Check "Run whether user is logged on or not"
- Check task history for errors
- Verify npm is in system PATH

## Monitoring & Alerts

Consider adding monitoring:

1. **Email alerts on failure** (add to wrapper script)
2. **Health check endpoint** that verifies last successful sync
3. **Dashboard showing sync status** and last sync time
4. **Slack/Discord webhooks** for notifications

## Recommended Production Setup

For production, use a process manager instead of cron for better reliability:

- **PM2** (Node.js process manager)
- **systemd** (Linux service)
- **Supervisor** (Python-based process manager)

Example PM2 setup:
```bash
pm2 start npm --name "mysql-sync" -- run sync:leads --cron "*/10 * * * *"
pm2 save
pm2 startup
```
