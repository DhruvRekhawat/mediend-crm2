# Quick Setup Guide: cron-job.org for MySQL Lead Sync

## Quick Setup (5 minutes)

### Step 1: Set API Secret

Add to your `.env` file:
```env
LEADS_API_SECRET=your_secure_random_string_here
```

Generate a secure secret:
- Online: https://www.random.org/strings/
- Or use: `openssl rand -hex 32` (Linux/Mac)

### Step 2: Deploy API

Ensure your API is accessible at:
```
https://workspace.mediend.com/api/sync/mysql-leads
```

### Step 3: Test API Manually

```bash
curl -X POST https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "Sync completed successfully",
    "processed": 150,
    "synced": 100,
    "updated": 50,
    "errors": 0
  }
}
```

### Step 4: Create cron-job.org Job

1. Go to https://cron-job.org and login
2. Click **"Create cronjob"**
3. Fill in:

   **Title**: `MySQL Lead Sync`
   
   **Address (URL)**: 
   ```
   https://workspace.mediend.com/api/sync/mysql-leads
   ```
   
   **Schedule**: 
   - Select **"Every X minutes"**
   - Enter `10`
   
   **Request method**: `POST`
   
   **Request headers** (click "Add Header" twice):
   ```
   Header 1:
   Name: Authorization
   Value: Bearer YOUR_API_SECRET_HERE
   
   Header 2:
   Name: Content-Type
   Value: application/json
   ```
   
   **Notifications**:
   - ✅ Enable email notifications
   - Enter your email address
   
   **Status**: `Enabled`

4. Click **"Create cronjob"**
5. Click **"Test now"** to verify it works

### Step 5: Verify It's Working

- Check execution logs in cron-job.org dashboard
- Look for successful responses (200 status code)
- Check your email for any failure notifications
- Use GET endpoint to check sync status:
  ```bash
  curl -X GET https://workspace.mediend.com/api/sync/mysql-leads \
    -H "Authorization: Bearer YOUR_API_SECRET"
  ```

## API Endpoints

### POST /api/sync/mysql-leads
Triggers incremental sync from MySQL.

**Headers:**
- `Authorization: Bearer YOUR_API_SECRET`
- `Content-Type: application/json`

**Response:**
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

### GET /api/sync/mysql-leads
Get current sync status and last sync information.

**Headers:**
- `Authorization: Bearer YOUR_API_SECRET`

**Response:**
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

## Troubleshooting

**401 Unauthorized?**
- ✅ Check `LEADS_API_SECRET` matches exactly in `.env` and cron-job.org
- ✅ Verify Bearer token format: `Bearer YOUR_SECRET` (with space)
- ✅ No extra spaces before/after secret

**500 Internal Server Error?**
- ✅ Check application logs
- ✅ Verify `MYSQL_SOURCE_URL` is set correctly
- ✅ Test MySQL connection: `npm run verify:mysql`

**Timeout?**
- ✅ Sync stops automatically at 9 minutes to avoid timeout
- ✅ Next run will continue from where it left off
- ✅ Check `executionTimeMs` in response

**No leads syncing?**
- ✅ Check `lastSyncedDate` in GET response
- ✅ Verify leads exist in MySQL with dates >= lastSyncedDate
- ✅ Run historic sync first if needed

## Security Notes

- 🔒 Never share your API secret publicly
- 🔒 Always use HTTPS (`https://`)
- 🔒 Rotate secrets periodically
- 🔒 Monitor cron-job.org logs for unauthorized attempts

## Need Help?

See [CRON_SETUP.md](CRON_SETUP.md) for detailed documentation and advanced configuration options.
