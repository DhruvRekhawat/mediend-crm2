# Cron Jobs Setup Guide

This guide explains how to set up automated cron jobs for **Leads Sync** and **Attendance Sync** using cron-job.org.

## Overview

You need to set up 2 cron jobs:

1. **Leads Sync** - Runs every 10 minutes to sync leads from MySQL to PostgreSQL
2. **Attendance Sync** - Runs daily at 2 AM to sync yesterday's attendance data

Both APIs are already implemented and ready to use. You just need to configure the cron jobs.

## Prerequisites

1. ✅ API endpoints are deployed and accessible
2. ✅ Environment variables are set (see below)
3. ✅ Database connections are configured

## Step 1: Set Up Environment Variables

Make sure these environment variables are set in your production environment (Vercel, etc.):

```env
# Leads Sync API Secret (required)
SYNC_API_SECRET=your_secure_random_string_here_min_32_chars
# OR use LEADS_API_SECRET (both work)
LEADS_API_SECRET=your_secure_random_string_here_min_32_chars

# Attendance Sync API Secret (optional but recommended)
ATTENDANCE_SYNC_SECRET=your_attendance_secret_key_here

# MySQL Connection (for leads sync)
MYSQL_SOURCE_URL=mysql://user:password@host:3306/database

# Attendance API Configuration (for attendance sync)
ATTENDANCE_API_BASE_URL=http://89.116.21.5:82/api
ATTENDANCE_API_USERNAME=biomax
ATTENDANCE_API_PASSWORD=biomax
ATTENDANCE_DEVICE_KEY=C263449807112E23
```

### Generate Secure Secrets

**On Linux/Mac:**
```bash
openssl rand -hex 32
```

**On Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## Step 2: Verify API Endpoints

Before setting up cron jobs, test both endpoints manually:

### Test Leads Sync Endpoint

```bash
curl -X POST https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_SYNC_API_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sync completed successfully",
    "lastSyncedDate": "2024-12-31T10:30:00.000Z",
    "processed": 150,
    "synced": 100,
    "updated": 50,
    "errors": 0
  }
}
```

### Test Attendance Sync Endpoint

```bash
curl -X POST https://workspace.mediend.com/api/attendance/sync/daily \
  -H "Authorization: Bearer YOUR_ATTENDANCE_SYNC_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-12-31",
    "processed": 45,
    "skipped": 2,
    "errors": 0,
    "total": 47
  }
}
```

## Step 3: Set Up Cron Jobs on cron-job.org

### Create Account

1. Go to https://cron-job.org
2. Sign up for a free account (or login if you have one)
3. Free tier allows up to 2 cron jobs (perfect for your needs!)

---

## Cron Job 1: Leads Sync

### Configuration

1. **Click "Create cronjob"**

2. **Fill in the details:**

   **Title**: `MySQL Lead Sync`
   
   **Address (URL)**: 
   ```
   https://workspace.mediend.com/api/sync/mysql-leads
   ```
   *(Replace with your actual domain if different)*
   
   **Schedule**: 
   - Select "Every X minutes"
   - Enter `10` minutes
   - Or use custom cron: `*/10 * * * *`
   
   **Request method**: `POST`
   
   **Request headers**:
   ```
   Authorization: Bearer YOUR_SYNC_API_SECRET_HERE
   Content-Type: application/json
   ```
   *(Replace `YOUR_SYNC_API_SECRET_HERE` with your actual secret)*
   
   **Status**: `Enabled`
   
   **Notifications**:
   - ✅ Enable email notifications
   - Set your email for failure alerts
   - Optionally enable success notifications (for monitoring)

3. **Advanced Settings** (Optional but recommended):
   - **Timeout**: Set to 9 minutes (cron-job.org has 10 min limit)
   - **Retry on failure**: Enable (recommended: 2-3 retries)
   - **Timezone**: Set to your server timezone

4. **Save and Test**
   - Click "Create cronjob"
   - Click "Test now" to verify it works
   - Check execution logs to confirm successful sync

---

## Cron Job 2: Attendance Sync

### Configuration

1. **Click "Create cronjob"**

2. **Fill in the details:**

   **Title**: `Daily Attendance Sync`
   
   **Address (URL)**: 
   ```
   https://workspace.mediend.com/api/attendance/sync/daily
   ```
   *(Replace with your actual domain if different)*
   
   **Schedule**: 
   - Select "Daily"
   - Set time to `02:00` (2 AM)
   - Or use custom cron: `0 2 * * *`
   
   **Request method**: `POST`
   
   **Request headers**:
   ```
   Authorization: Bearer YOUR_ATTENDANCE_SYNC_SECRET_HERE
   Content-Type: application/json
   ```
   *(Replace `YOUR_ATTENDANCE_SYNC_SECRET_HERE` with your actual secret)*
   
   **Status**: `Enabled`
   
   **Notifications**:
   - ✅ Enable email notifications
   - Set your email for failure alerts
   - Optionally enable success notifications (for monitoring)

3. **Advanced Settings** (Optional but recommended):
   - **Timeout**: Set to 5 minutes (should be enough for daily sync)
   - **Retry on failure**: Enable (recommended: 2-3 retries)
   - **Timezone**: Set to IST (India Standard Time) or your local timezone

4. **Save and Test**
   - Click "Create cronjob"
   - Click "Test now" to verify it works
   - Check execution logs to confirm successful sync

---

## Monitoring & Verification

### Check Leads Sync Status

```bash
curl -X GET https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_SYNC_API_SECRET"
```

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

### Check Cron Job Execution Logs

1. Log in to cron-job.org
2. Click on each cron job
3. View "Execution history" tab
4. Check for any failures or errors

### Monitor via Email

- cron-job.org will send email notifications on failures
- Check your email for any alerts
- Review execution logs if syncs are failing

---

## Troubleshooting

### Leads Sync Issues

**401 Unauthorized:**
- ✅ Check `SYNC_API_SECRET` or `LEADS_API_SECRET` is set in environment
- ✅ Verify Bearer token in cron-job.org matches the secret exactly
- ✅ Ensure no extra spaces in the Authorization header

**500 Error:**
- ✅ Check application logs for detailed error messages
- ✅ Verify MySQL connection (`MYSQL_SOURCE_URL` is correct)
- ✅ Ensure database is accessible and migrations are run
- ✅ Check if BD users exist (auto-creation should handle this)

**Sync Timeout:**
- ✅ The API has a 9-minute timeout to prevent cron-job.org timeout
- ✅ If sync takes longer, it will stop at safe point and resume next run
- ✅ Check execution time in response `executionTimeMs`

**No Leads Being Synced:**
- ✅ Check `lastSyncedDate` in status response
- ✅ Verify there are leads in MySQL with `Lead_Date >= lastSyncedDate`
- ✅ Check MySQL connection is working

### Attendance Sync Issues

**401 Unauthorized:**
- ✅ Check `ATTENDANCE_SYNC_SECRET` is set in environment
- ✅ Verify Bearer token in cron-job.org matches the secret exactly
- ✅ Note: If `ATTENDANCE_SYNC_SECRET` is not set, the endpoint will work without auth (not recommended for production)

**500 Error:**
- ✅ Check application logs for detailed error messages
- ✅ Verify attendance API credentials are correct:
  - `ATTENDANCE_API_BASE_URL`
  - `ATTENDANCE_API_USERNAME`
  - `ATTENDANCE_API_PASSWORD`
  - `ATTENDANCE_DEVICE_KEY`
- ✅ Ensure employees exist in database with correct `employeeCode`

**No Attendance Being Synced:**
- ✅ Check if there are attendance logs for yesterday in the biometric API
- ✅ Verify employee codes match between API and database
- ✅ Check execution logs in cron-job.org for error details

---

## Alternative: Vercel Cron Jobs

If you're deploying on Vercel, you can use Vercel Cron Jobs instead of cron-job.org.

### Create `vercel.json`

Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/sync/mysql-leads",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/attendance/sync/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Update API Routes for Vercel Cron

Vercel Cron Jobs send a special header. Update your routes to handle it:

**For `/api/sync/mysql-leads/route.ts`:**
Add this check at the beginning of POST handler:
```typescript
// Support Vercel Cron Jobs
const authHeader = request.headers.get('authorization')
const cronSecret = request.headers.get('x-vercel-cron-secret')
const expectedSecret = process.env.SYNC_API_SECRET || process.env.LEADS_API_SECRET
const vercelCronSecret = process.env.CRON_SECRET

// Allow Vercel cron or Bearer token
if (cronSecret && vercelCronSecret && cronSecret === vercelCronSecret) {
  // Vercel cron request, proceed
} else if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7)
  if (!expectedSecret || token !== expectedSecret) {
    return unauthorizedResponse('Invalid API token')
  }
} else {
  return unauthorizedResponse('Missing or invalid Authorization header')
}
```

**For `/api/attendance/sync/daily/route.ts`:**
Similar update:
```typescript
// Support Vercel Cron Jobs
const authHeader = request.headers.get('authorization')
const cronSecret = request.headers.get('x-vercel-cron-secret')
const expectedSecret = process.env.ATTENDANCE_SYNC_SECRET
const vercelCronSecret = process.env.CRON_SECRET

// Allow Vercel cron or Bearer token
if (cronSecret && vercelCronSecret && cronSecret === vercelCronSecret) {
  // Vercel cron request, proceed
} else if (expectedSecret) {
  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return errorResponse('Unauthorized', 401)
  }
}
```

**Add to environment variables:**
```env
CRON_SECRET=your_vercel_cron_secret_here
```

**Note:** cron-job.org is recommended as it's simpler and doesn't require code changes.

---

## Security Best Practices

1. **Use Strong API Secrets**
   - Minimum 32 characters
   - Mix of letters, numbers, and special characters
   - Never commit secrets to git

2. **Rotate Secrets Periodically**
   - Update secrets in environment
   - Update cron-job.org headers
   - Old requests will fail (good for security)

3. **Monitor Failed Attempts**
   - Check cron-job.org logs for unauthorized attempts
   - Set up alerts for multiple failures
   - Review execution patterns

4. **HTTPS Only**
   - Always use `https://` in cron-job.org
   - Never use `http://` (secrets sent in plaintext)

---

## Summary

After completing this setup, you will have:

✅ **Leads Sync** running every 10 minutes automatically  
✅ **Attendance Sync** running daily at 2 AM automatically  
✅ Email notifications for failures  
✅ Execution history and logs  
✅ Easy monitoring via cron-job.org dashboard

Both cron jobs will run automatically and keep your data in sync!

---

## Quick Reference

### Leads Sync
- **Endpoint**: `POST /api/sync/mysql-leads`
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Auth**: Bearer token with `SYNC_API_SECRET` or `LEADS_API_SECRET`

### Attendance Sync
- **Endpoint**: `POST /api/attendance/sync/daily`
- **Schedule**: Daily at 2 AM (`0 2 * * *`)
- **Auth**: Bearer token with `ATTENDANCE_SYNC_SECRET` (optional but recommended)

### Test Commands
```bash
# Test Leads Sync
curl -X POST https://workspace.mediend.com/api/sync/mysql-leads \
  -H "Authorization: Bearer YOUR_SECRET"

# Test Attendance Sync
curl -X POST https://workspace.mediend.com/api/attendance/sync/daily \
  -H "Authorization: Bearer YOUR_SECRET"
```
