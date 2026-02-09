# Cron Jobs Setup Instructions

Your cron jobs are not currently configured on the VPS server. Follow these steps to set them up.

## Quick Setup (Recommended)

SSH into your VPS and run:

```bash
cd /opt/mediend-crm
# Upload setup-cron.sh to the server first, or create it there
sudo bash setup-cron.sh
```

## Manual Setup

If you prefer to set up manually:

### 1. Ensure CRON_SECRET is set

Check that `CRON_SECRET` exists in `/opt/mediend-crm/.env.production`:

```bash
cd /opt/mediend-crm
grep CRON_SECRET .env.production
```

If it's missing, generate one and add it:

```bash
# Generate secret
openssl rand -base64 32

# Add to .env.production
nano .env.production
# Add: CRON_SECRET=<generated-secret>
```

### 2. Create backup script

```bash
mkdir -p /opt/backups
nano /opt/backups/pg_backup.sh
```

Paste this content:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec mediend-crm-postgres-1 \
  pg_dump -U postgres mediend_crm | gzip > "$BACKUP_DIR/mediend_crm_$TIMESTAMP.sql.gz"
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "[$(date)] Backup: mediend_crm_$TIMESTAMP.sql.gz"
```

Make it executable:

```bash
chmod +x /opt/backups/pg_backup.sh
```

### 3. Add cron jobs

```bash
crontab -e
```

Add these lines (replace `YOUR_CRON_SECRET` with the actual value from `.env.production`):

```cron
# Mediend CRM Cron Jobs
# Attendance sync - every 5 minutes
*/5 * * * * curl -sf -X POST http://localhost:3000/api/cron/attendance -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cron-attendance.log 2>&1

# Leads sync - every 5 minutes
*/5 * * * * curl -sf -X POST http://localhost:3000/api/cron/leads -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cron-leads.log 2>&1

# Database backup - daily at 2 AM UTC
0 2 * * * /opt/backups/pg_backup.sh >> /var/log/pg_backup.log 2>&1

# Cleanup old logs - daily at 3 AM UTC
0 3 * * * curl -sf -X POST http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/cron-cleanup.log 2>&1
```

### 4. Verify cron jobs

```bash
# View current crontab
crontab -l

# Test endpoints manually
curl -X POST http://localhost:3000/api/cron/attendance \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/leads \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Monitor logs

```bash
# Watch attendance sync logs
tail -f /var/log/cron-attendance.log

# Watch leads sync logs
tail -f /var/log/cron-leads.log

# Watch cleanup logs
tail -f /var/log/cron-cleanup.log

# Watch backup logs
tail -f /var/log/pg_backup.log
```

## Troubleshooting

### Cron jobs not running

1. **Check if cron service is running:**
   ```bash
   systemctl status cron
   ```

2. **Check cron logs:**
   ```bash
   grep CRON /var/log/syslog | tail -20
   ```

3. **Verify CRON_SECRET matches:**
   ```bash
   # On server
   grep CRON_SECRET /opt/mediend-crm/.env.production
   
   # In crontab
   crontab -l | grep CRON_SECRET
   ```

4. **Test endpoints manually:**
   ```bash
   # Get CRON_SECRET from env
   CRON_SECRET=$(grep "^CRON_SECRET=" /opt/mediend-crm/.env.production | cut -d '=' -f2- | tr -d '"' | xargs)
   
   # Test attendance
   curl -X POST http://localhost:3000/api/cron/attendance \
     -H "Authorization: Bearer $CRON_SECRET"
   
   # Test leads
   curl -X POST http://localhost:3000/api/cron/leads \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### 401 Unauthorized errors

- Make sure `CRON_SECRET` is set in `.env.production`
- Make sure the secret in crontab matches exactly (no extra spaces)
- Restart the app container after changing `.env.production`:
  ```bash
  cd /opt/mediend-crm
  docker compose restart app
  ```

### Endpoints return 500 errors

- Check app logs:
  ```bash
  docker compose logs app --tail 50
  ```
- Verify the underlying sync endpoints work:
  - `/api/attendance/sync/daily` requires `ATTENDANCE_SYNC_SECRET`
  - `/api/sync/mysql-leads` requires `SYNC_API_SECRET` or `LEADS_API_SECRET`

## Cron Job Schedule

- **Attendance Sync**: Every 5 minutes (`*/5 * * * *`)
- **Leads Sync**: Every 5 minutes (`*/5 * * * *`)
- **Database Backup**: Daily at 2 AM UTC (`0 2 * * *`)
- **Log Cleanup**: Daily at 3 AM UTC (`0 3 * * *`)

## Viewing Cron Job History

You can view cron job execution history in the admin dashboard:

1. Go to `/admin/system`
2. Click on "Cron Logs" panel
3. View recent executions, success rates, and errors
