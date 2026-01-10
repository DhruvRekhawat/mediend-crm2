# MySQL Lead Sync Guide

This document describes how to sync leads from a legacy MySQL/MariaDB database to the PostgreSQL database.

## Overview

The sync system transfers data from:
- **Source**: MySQL database (`kundkun_mediendcrm`)
- **Tables**: `lead`, `lead_remarks`
- **Target**: PostgreSQL database (via Prisma)

## Prerequisites

1. **Read-only MySQL user** with SELECT permissions on:
   - `lead` table
   - `lead_remarks` table

2. **Environment variable** configured:
   ```env
   MYSQL_SOURCE_URL="mysql://lead_reader:password@kundkundtc.in:3306/kundkun_mediendcrm"
   ```

3. **Database migration** run to add new fields:
   ```bash
   npm run db:push
   # or
   npm run db:migrate
   ```

## Setup

### 0. Verify MySQL Connection (Recommended First Step)

Before running any syncs, verify your MySQL connection:

```bash
npm run verify:mysql
```

This will:
- ✅ Test MySQL connection
- ✅ Verify database and tables exist
- ✅ Check SELECT permissions on `lead` and `lead_remarks` tables
- ✅ Show sample data and row counts
- ✅ Validate date-based queries
- ✅ Check required fields exist

**If verification fails**, fix the issues before proceeding with sync.

### 1. Install Dependencies

```bash
npm install
# This will install mysql2 and @types/mysql2
```

### 2. Configure Environment

Add to your `.env` file:
```env
MYSQL_SOURCE_URL="mysql://lead_reader:password@kundkundtc.in:3306/kundkun_mediendcrm"
HISTORIC_SYNC_FROM_DATE=2024-12-31  # Optional, defaults to 2024-12-31
```

### 3. Run Database Migration

The schema has been extended with:
- Additional fields in `Lead` model (all 68 MySQL fields)
- New `LeadRemark` model for remarks
- New `SyncState` model for tracking sync progress

```bash
npm run db:push
```

## Usage

### One-time Historic Sync

Sync all leads from a specific date onwards:

```bash
# Using default date from HISTORIC_SYNC_FROM_DATE env var
npm run sync:historic:leads

# Or specify date as argument
npm run sync:historic:leads 2024-12-31

# Or use environment variable
HISTORIC_SYNC_FROM_DATE=2024-12-31 npm run sync:historic:leads
```

**What it does:**
- Queries all leads where `Lead_Date >= fromDate`
- Processes in batches of 1000 records
- Maps all 68 MySQL fields to PostgreSQL Lead model
- Syncs associated `lead_remarks` records
- Updates `SyncState` after completion

### Incremental Sync

Sync only new/updated leads since last sync:

```bash
npm run sync:leads
```

**What it does:**
- Reads `SyncState` to get `lastSyncedDate`
- Queries leads where `Lead_Date >= lastSyncedDate`
- Processes up to 1000 records per run
- Updates existing leads or creates new ones
- Syncs remarks for processed leads
- Updates `SyncState` with new `lastSyncedDate`

### Automated Sync (Cron)

Set up a cron job to run incremental sync every 10 minutes:

```bash
crontab -e
```

Add this line:
```cron
*/10 * * * * cd /path/to/mediend-crm-v2 && npm run sync:leads >> logs/sync-leads.log 2>&1
```

**Important:** Create the `logs` directory first:
```bash
mkdir -p logs
```

## Field Mapping

All 68 MySQL fields are mapped to the Prisma Lead model:

### Core Fields
- `id` → `leadRef` (unique identifier)
- `Patient_Name` → `patientName`
- `Patient_Number` → `phoneNumber`
- `BDM` → `bdId` (matched by name to User with role BD)
- `Status` → `status`
- `Circle` → `circle` (enum: North, South, East, West, Central)

### Additional Fields
- OPD fields: `opdHospital`, `opdDrName`, `opdCharges`, etc.
- IPD fields: `ipdHospital`, `ipdDrName`, `ipdTotalPayment`, etc.
- Communication: `patientEmail`, `whatsapp`, `whatsappMessage`
- Metadata: `month`, `leadEntryDate`, `followUpDate`, `profession`, etc.

See `lib/sync/mysql-lead-mapper.ts` for complete mapping.

## Lead Remarks

The `lead_remarks` table is synced separately:
- Each remark creates a `LeadRemark` record
- Linked to Lead via `leadRef` (MySQL lead.id)
- Preserves: `Remarks`, `UpdateBy`, `UpdateDate`, `IP`, `LeadStatus`

## Sync State Tracking

The `SyncState` model tracks:
- `lastSyncedDate`: Last `Lead_Date` processed
- `lastSyncedId`: Last MySQL lead.id processed
- `recordsCount`: Total records synced
- `lastRunAt`: Timestamp of last sync run

## Error Handling

- **Connection errors**: Script fails with clear error message
- **Missing BD users**: Error logged, lead skipped (or BD created if auto-create enabled in future)
- **Duplicate leads**: Existing leads are updated with new data
- **Invalid data**: Errors logged per record, sync continues

## Verification

Always run the verification script first to ensure everything is set up correctly:

```bash
npm run verify:mysql
```

This script will catch common issues:
- Missing environment variables
- Connection failures
- Missing tables
- Permission issues
- Incorrect field names

## Troubleshooting

### "MYSQL_SOURCE_URL environment variable is not set"
- Add `MYSQL_SOURCE_URL` to your `.env` file

### "BD user not found"
- Ensure BD users exist in PostgreSQL with matching names
- Check case sensitivity and exact name matching

### "No users found in system"
- Create at least one user (preferably ADMIN) in PostgreSQL
- Use seed script: `npm run db:seed` or `/admin/seed-users`

### Sync is slow
- Normal for historic sync (processes in batches)
- Incremental sync should be fast (< 1 minute for < 1000 records)

### Missing fields after sync
- Check field mapping in `lib/sync/mysql-lead-mapper.ts`
- Verify MySQL table structure matches expected fields

## Files

- `lib/mysql-source-client.ts` - MySQL connection pool and query utilities
- `lib/sync/mysql-lead-mapper.ts` - Field mapping logic
- `scripts/sync-mysql-leads.ts` - Incremental sync script
- `scripts/sync-historic-mysql-leads.ts` - Historic sync script
- `prisma/schema.prisma` - Extended Lead model, LeadRemark, SyncState

## Performance

- **Batch size**: 1000 records per batch
- **Connection pooling**: 10 concurrent connections
- **Incremental sync**: ~1-5 minutes for 1000 records
- **Historic sync**: Depends on total records (hours for large datasets)

## Security

- Uses read-only MySQL user (SELECT only)
- No writes to source MySQL database
- Connection credentials stored in environment variables (not committed)

## Next Steps

After initial sync:
1. Monitor first few incremental syncs for errors
2. Verify data integrity (compare counts, spot-check records)
3. Set up cron job for automated syncing
4. Configure alerting for sync failures (optional)
