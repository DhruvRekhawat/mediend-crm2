# Attendance Sync Documentation

This document explains how to sync attendance data from the external biometric API.

## Overview

The attendance system integrates with an external biometric API to fetch and store attendance logs. The system supports:

1. **Historic Data Sync**: One-time sync of data from December 1st to today
2. **Daily Sync**: Automated daily sync of yesterday's attendance data
3. **Manual Sync**: On-demand sync via the HR Attendance page

## Configuration

Add the following environment variables to your `.env` file:

```env
# Attendance API Configuration
ATTENDANCE_API_BASE_URL=http://89.116.21.5:82/api
ATTENDANCE_API_USERNAME=biomax
ATTENDANCE_API_PASSWORD=biomax
ATTENDANCE_DEVICE_KEY=C263449807112E23

# Optional: Secret for securing daily sync endpoint
ATTENDANCE_SYNC_SECRET=your-secret-key-here
```

## Historic Data Sync

To sync historic attendance data from December 1st to today, run:

```bash
npm run sync:historic
```

Or directly:

```bash
npx tsx scripts/sync-historic-attendance.ts
```

This script will:
- Fetch all attendance logs from December 1st to today
- Match employee codes with employees in the database
- Skip duplicate entries
- Display a summary of processed, skipped, and error records

## Daily Sync

The daily sync endpoint is available at:

```
POST /api/attendance/sync/daily
GET /api/attendance/sync/daily
```

### Setting up Automated Daily Sync

#### Option 1: Vercel Cron Jobs

If deploying on Vercel, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/attendance/sync/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This will run the sync daily at 2 AM UTC.

#### Option 2: External Cron Service

Use a service like:
- **GitHub Actions**: Create a workflow that calls the endpoint daily
- **Cron-job.org**: Set up a daily HTTP request to your endpoint
- **AWS EventBridge**: Schedule a Lambda function to call the endpoint

Example curl command:

```bash
curl -X POST https://your-domain.com/api/attendance/sync/daily \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

#### Option 3: Server Cron Job

If running on a server, add to crontab:

```bash
0 2 * * * curl -X POST http://localhost:3000/api/attendance/sync/daily -H "Authorization: Bearer YOUR_SECRET_KEY"
```

## Manual Sync

HR users can manually sync attendance data from the HR Attendance page:

1. Navigate to `/hr/attendance`
2. Click "Sync Attendance" button
3. Select date range
4. Click "Sync"

This uses the `/api/attendance/sync` endpoint which requires `hrms:attendance:write` permission.

## API Response Mapping

The external API returns logs with the following structure:

```typescript
{
  Id: number
  DeviceKey: string
  DeviceName: string
  UserId: string
  EmpCode: string        // Maps to Employee.employeeCode
  UserName: string
  IOTime: string         // ISO 8601 timestamp -> AttendanceLog.logDate
  IOMode: 'in' | 'out'  // Maps to AttendanceLog.punchDirection
  VerifyMode: string
  WorkCode: string
  CreatedOn: string
  ImagePath: string
}
```

### Important Note about `IOTime` / Timezones

- The biometric API’s `IOTime` value is already the **final IST wall-clock time** we want to show.
- The system **does not** apply any timezone conversions to `IOTime`.
- We store `IOTime` into `AttendanceLog.logDate` **as-is** and always format / compute using **UTC getters/formatting** so the displayed time matches `IOTime` exactly (no `+5:30` shifts).

## Data Flow

1. **Authentication**: System authenticates with the external API using username/password
2. **Token Caching**: Authentication token is cached for 1 hour to reduce API calls
3. **Fetch Logs**: Attendance logs are fetched for the specified date range
4. **Employee Matching**: Logs are matched to employees using `EmpCode` → `Employee.employeeCode`
5. **Deduplication**: Duplicate entries are skipped based on `employeeId`, `logDate`, and `punchDirection`
6. **Storage**: Valid logs are stored in the `AttendanceLog` table

## Troubleshooting

### Authentication Errors

If you see authentication errors:
- Verify `ATTENDANCE_API_USERNAME` and `ATTENDANCE_API_PASSWORD` are correct
- Check that the API endpoint is accessible
- Token cache is automatically cleared on 401 errors

### Employee Not Found

If logs are being skipped due to missing employees:
- Ensure employees are created in the system with correct `employeeCode`
- Verify that `EmpCode` from the API matches `Employee.employeeCode` in the database

### Duplicate Entries

The system automatically prevents duplicates using a unique constraint on:
- `employeeId`
- `logDate`
- `punchDirection`

If you need to re-sync data, delete existing records first or the duplicates will be skipped.

## Monitoring

Check sync status by:
1. Viewing attendance records in `/hr/attendance`
2. Checking application logs for sync operations
3. Monitoring the sync endpoint response for processed/skipped/error counts

