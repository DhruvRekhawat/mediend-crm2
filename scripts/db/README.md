# DB scripts for lead sync

## Sanity-check queries (after sync)

### PostgreSQL (Prisma/your app DB)

- **Total leads and date range:**
  ```sql
  SELECT COUNT(*) AS total_leads, MIN("createdDate") AS first_lead_date, MAX("createdDate") AS latest_lead_date FROM "Lead";
  ```
  Expect: total close to MySQL count; first/latest near your MySQL `Lead_Date` min/max.

- **Source and treatment mapping (sample):**
  ```sql
  SELECT source, treatment, COUNT(*) AS c FROM "Lead" GROUP BY source, treatment ORDER BY c DESC LIMIT 20;
  ```
  Expect: `source` and `treatment` as readable names (e.g. Facebook, Lipoma), not raw numeric IDs.

- **Leads with createdDate = epoch (missing date fallback):**
  ```sql
  SELECT COUNT(*) FROM "Lead" WHERE "createdDate" = '1970-01-01T00:00:00.000Z';
  ```
  Expect: 0 or a small number (only rows where Lead_Date, LeadEntryDate, and create_date were all null/invalid).

### MySQL (source)

- **Lead_Date coverage:**
  ```sql
  SELECT COUNT(*) AS total, SUM(Lead_Date IS NOT NULL) AS with_lead_date, SUM(LeadEntryDate IS NOT NULL) AS with_entry_date FROM lead;
  ```
  Expect: `with_lead_date` ≈ total (e.g. 102004/102004).

- **Date range:**
  ```sql
  SELECT MIN(Lead_Date) AS first_lead_date, MAX(Lead_Date) AS latest_lead_date FROM lead;
  ```

Run these after a full historic or incremental sync and compare PostgreSQL totals and date range to MySQL.

---

## Truncate and re-import

1. **Truncate leads for full re-import**  
   `scripts/db/truncate-leads-for-reimport.sql`  
   - Deletes all `LeadRemark` and `Lead` rows and resets `SyncState` for `mysql_leads`.  
   - After running, trigger a full historic sync (or incremental sync with an old `lastSyncedDate`) so all leads are pulled from MySQL again.

2. **Re-import flow**  
   - Run `truncate-leads-for-reimport.sql` against PostgreSQL.  
   - Reset sync state (included in the script).  
   - Run historic sync: `npm run sync:historic:leads` (or call the historic sync API) with your desired start date (e.g. `2025-12-01`).  
   - Or run incremental sync repeatedly until no new leads; the first run after reset will use the default `lastSyncedDate` (e.g. yesterday).

## Optional date correction

- **Update createdDate from leadEntryDate**  
  `scripts/db/update-created-date-from-lead-entry.sql`  
  - Use only when you are **not** doing a full re-import.  
  - Sets `createdDate = leadEntryDate` where `leadEntryDate` is not null and different from `createdDate`.

## Running the scripts

Example with `psql`:

```bash
psql "$DATABASE_URL" -f scripts/db/truncate-leads-for-reimport.sql
psql "$DATABASE_URL" -f scripts/db/update-created-date-from-lead-entry.sql
```

Or execute the SQL manually in your PostgreSQL client.
