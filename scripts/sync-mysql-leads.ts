import 'dotenv/config'
import { queryMySQL, closeMySQLPool, testMySQLConnection } from '@/lib/mysql-source-client'
import { prisma } from '@/lib/prisma'
import { mapMySQLLeadToPrisma, getLeadReceivedDate, type MySQLLeadRow } from '@/lib/sync/mysql-lead-mapper'
import { UserRole } from '@/generated/prisma/client'
import pLimit from 'p-limit'

interface MySQLRemarkRow {
  id: number
  RefId: number
  Remarks: string
  UpdateBy: number | null
  UpdateDate: Date | string
  IP: string | null
  LeadStatus: number | null
}

const BATCH_SIZE = 2500
const SYNC_SOURCE_TYPE = 'mysql_leads'
const CONCURRENCY_LIMIT = 15

/** Parse --from YYYY-MM-DD from argv; returns null if absent. */
function parseFromArg(): Date | null {
  const idx = process.argv.indexOf('--from')
  if (idx === -1 || idx + 1 >= process.argv.length) return null
  const d = new Date(process.argv[idx + 1] + 'T00:00:00Z')
  if (isNaN(d.getTime())) {
    console.error(`Invalid --from date: ${process.argv[idx + 1]}  (expected YYYY-MM-DD)`)
    process.exit(1)
  }
  return d
}

/**
 * Get or create sync state
 */
async function getSyncState() {
  let syncState = await prisma.syncState.findUnique({
    where: { sourceType: SYNC_SOURCE_TYPE },
  })

  if (!syncState) {
    // Initialize with a default date (e.g., 1 day ago if no state exists)
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() - 1)

    syncState = await prisma.syncState.create({
      data: {
        sourceType: SYNC_SOURCE_TYPE,
        lastSyncedDate: defaultDate,
        lastSyncedId: null,
        recordsCount: 0,
        lastRunAt: new Date(),
      },
    })
  }

  return syncState
}

/**
 * Update sync state
 */
async function updateSyncState(
  lastSyncedDate: Date,
  lastSyncedId: number | null,
  recordsCount: number
) {
  await prisma.syncState.upsert({
    where: { sourceType: SYNC_SOURCE_TYPE },
    update: {
      lastSyncedDate,
      lastSyncedId,
      recordsCount: {
        increment: recordsCount,
      },
      lastRunAt: new Date(),
    },
    create: {
      sourceType: SYNC_SOURCE_TYPE,
      lastSyncedDate,
      lastSyncedId,
      recordsCount,
      lastRunAt: new Date(),
    },
  })
}

/**
 * Batch fetch existing leads by leadRef with key fields for comparison
 */
async function fetchExistingLeads(
  leadRefs: string[]
): Promise<Map<string, { updatedDate: Date | null; patientName: string; status: string; bdId: string }>> {
  if (leadRefs.length === 0) return new Map()

  // Prisma has a limit on the 'in' clause, so we need to chunk
  const CHUNK_SIZE = 1000
  const existingLeadsMap = new Map<string, { updatedDate: Date | null; patientName: string; status: string; bdId: string }>()

  for (let i = 0; i < leadRefs.length; i += CHUNK_SIZE) {
    const chunk = leadRefs.slice(i, i + CHUNK_SIZE)
    const leads = await prisma.lead.findMany({
      where: { leadRef: { in: chunk } },
      select: {
        leadRef: true,
        updatedDate: true,
        patientName: true,
        status: true,
        bdId: true,
      },
    })
    leads.forEach((lead) => {
      existingLeadsMap.set(lead.leadRef, {
        updatedDate: lead.updatedDate,
        patientName: lead.patientName,
        status: lead.status,
        bdId: lead.bdId,
      })
    })
  }

  return existingLeadsMap
}

/**
 * Batch fetch all BD users and create a lookup map
 */
async function fetchBDUsersMap(): Promise<Map<string, { id: string; circle: string | null }>> {
  const bdUsers = await prisma.user.findMany({
    where: { role: UserRole.BD },
    select: {
      id: true,
      name: true,
      team: {
        select: {
          circle: true,
        },
      },
    },
  })

  const bdMap = new Map<string, { id: string; circle: string | null }>()

  // Create multiple lookup keys for each BD user
  for (const user of bdUsers) {
    const name = user.name.trim()
    const circle = user.team?.circle || null

    // Add exact match (case-insensitive key)
    bdMap.set(name.toLowerCase(), { id: user.id, circle })

    // Add first name match
    const firstName = name.split(' ')[0]
    if (firstName && firstName.length > 2) {
      if (!bdMap.has(firstName.toLowerCase())) {
        bdMap.set(firstName.toLowerCase(), { id: user.id, circle })
      }
    }

    // Add "BD-{number}" format if name is numeric
    if (/^\d+$/.test(name)) {
      bdMap.set(`bd-${name}`, { id: user.id, circle })
    }
  }

  return bdMap
}

/**
 * Optimized sync lead remarks using batch operations
 */
async function syncLeadRemarks(leadIds: number[]) {
  if (leadIds.length === 0) return

  try {
    // Fetch all remarks in one query
    const remarks = await queryMySQL<MySQLRemarkRow>(
      `SELECT * FROM lead_remarks WHERE RefId IN (${leadIds.map(() => '?').join(',')}) ORDER BY UpdateDate`,
      leadIds
    )

    if (remarks.length === 0) {
      return
    }

    // Get all leadRefs that exist
    const leadRefs = leadIds.map((id) => String(id))
    const existingLeads = await fetchExistingLeads(leadRefs)
    const existingLeadRefsSet = existingLeads

    // Filter remarks to only those for existing leads
    const validRemarks = remarks.filter((remark) =>
      existingLeadRefsSet.has(String(remark.RefId))
    )

    if (validRemarks.length === 0) {
      return
    }

    // Batch fetch existing remarks to avoid duplicates
    // Create a set of existing remark keys (leadRef + updateDate + remarks)
    const existingRemarkKeys = new Set<string>()

    // Chunk the remarks check to avoid query size limits
    const CHUNK_SIZE = 500
    for (let i = 0; i < validRemarks.length; i += CHUNK_SIZE) {
      const chunk = validRemarks.slice(i, i + CHUNK_SIZE)
      const leadRefsChunk = [...new Set(chunk.map((r) => String(r.RefId)))]

      const existingRemarks = await prisma.leadRemark.findMany({
        where: {
          leadRef: { in: leadRefsChunk },
        },
        select: {
          leadRef: true,
          updateDate: true,
          remarks: true,
        },
      })

      existingRemarks.forEach((r) => {
        const key = `${r.leadRef}|${r.updateDate.toISOString()}|${r.remarks}`
        existingRemarkKeys.add(key)
      })
    }

    // Prepare new remarks for batch insert
    const newRemarks = validRemarks
      .map((remark) => {
        const leadRef = String(remark.RefId)
        const updateDate = new Date(remark.UpdateDate)
        const key = `${leadRef}|${updateDate.toISOString()}|${remark.Remarks}`

        if (existingRemarkKeys.has(key)) {
          return null // Skip duplicate
        }

        return {
          leadRef,
          remarks: remark.Remarks,
          updateBy: remark.UpdateBy ?? null,
          updateDate,
          ip: remark.IP ?? null,
          leadStatus: remark.LeadStatus ?? null,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    // Batch create new remarks
    if (newRemarks.length > 0) {
      // Prisma createMany has limitations, so we'll chunk it
      const REMARK_CHUNK_SIZE = 1000
      for (let i = 0; i < newRemarks.length; i += REMARK_CHUNK_SIZE) {
        const chunk = newRemarks.slice(i, i + REMARK_CHUNK_SIZE)
        await prisma.leadRemark.createMany({
          data: chunk,
          skipDuplicates: true,
        })
      }
      console.log(`✅ Synced ${newRemarks.length} lead remarks`)
    }
  } catch (error) {
    console.error('Error syncing lead remarks:', error)
  }
}

/**
 * Sync a single batch of leads. Returns the count of leads fetched (0 = done).
 */
async function syncOneBatch(
  lastSyncedDate: Date,
  systemUserId: string,
  totalSyncedSoFar: number
): Promise<{ fetched: number; maxDate: Date; maxId: number | null; synced: number; updated: number; errors: number }> {
  console.log(`\n📥 Fetching leads from MySQL (batch size: ${BATCH_SIZE})...`)
  const leads = await queryMySQL<MySQLLeadRow>(
    `SELECT * FROM lead
     WHERE (Lead_Date >= ? OR (Lead_Date IS NULL AND COALESCE(LeadEntryDate, create_date) >= ?))
        OR (update_date IS NOT NULL AND update_date >= ?)
     ORDER BY COALESCE(Lead_Date, LeadEntryDate, create_date) ASC, id ASC
     LIMIT ?`,
    [lastSyncedDate, lastSyncedDate, lastSyncedDate, BATCH_SIZE]
  )

  if (leads.length === 0) return { fetched: 0, maxDate: lastSyncedDate, maxId: null, synced: 0, updated: 0, errors: 0 }

  console.log(`✅ Found ${leads.length} leads to sync`)
  const dateRange = {
    earliest: leads[0].Lead_Date ? new Date(leads[0].Lead_Date).toISOString() : 'N/A',
    latest: leads[leads.length - 1].Lead_Date ? new Date(leads[leads.length - 1].Lead_Date).toISOString() : 'N/A',
  }
  console.log(`   Date range: ${dateRange.earliest} to ${dateRange.latest}`)

  const leadRefs = leads.map((l) => String(l.id))
  const existingLeadsMap = await fetchExistingLeads(leadRefs)
  console.log(`   Existing: ${existingLeadsMap.size}, New: ${leads.length - existingLeadsMap.size}`)

  const limit = pLimit(CONCURRENCY_LIMIT)
  let syncedCount = 0
  let updatedCount = 0
  let errorCount = 0
  const syncedLeadIds: number[] = []
  const leadsToCreate: any[] = []
  const leadsToUpdate: Array<{ leadRef: string; data: any }> = []
  const leadDates: Date[] = []
  const leadIds: number[] = []
  const updateDates: Date[] = []

  const processLead = async (mysqlLead: MySQLLeadRow) => {
    try {
      const leadRef = String(mysqlLead.id)
      const leadDate = getLeadReceivedDate(mysqlLead)
      leadDates.push(leadDate)
      leadIds.push(mysqlLead.id)
      if (mysqlLead.update_date) {
        const ud = new Date(mysqlLead.update_date)
        if (!isNaN(ud.getTime())) updateDates.push(ud)
      }

      const leadData = await mapMySQLLeadToPrisma(mysqlLead, systemUserId)
      if (!leadData.bdId) { errorCount++; return }

      const { updatedDate, ...leadDataForPrisma } = leadData
      const existingLead = existingLeadsMap.get(leadRef)

      if (existingLead) {
        const hasChanged =
          existingLead.patientName !== leadDataForPrisma.patientName ||
          existingLead.status !== leadDataForPrisma.status ||
          existingLead.bdId !== leadDataForPrisma.bdId ||
          (updatedDate && existingLead.updatedDate && updatedDate.getTime() !== existingLead.updatedDate.getTime()) ||
          (!existingLead.updatedDate && updatedDate)

        if (hasChanged) {
          leadsToUpdate.push({ leadRef, data: leadDataForPrisma })
          updatedCount++
          syncedLeadIds.push(mysqlLead.id)
        }
      } else {
        leadsToCreate.push(leadDataForPrisma)
        syncedCount++
        syncedLeadIds.push(mysqlLead.id)
      }
    } catch (error) {
      errorCount++
      console.error(`Error processing lead ${mysqlLead.id}:`, error)
    }
  }

  await Promise.allSettled(leads.map((lead) => limit(() => processLead(lead))))

  const allDates = [...leadDates.map((d) => d.getTime()), ...updateDates.map((d) => d.getTime())]
  const maxDate =
    allDates.length > 0
      ? new Date(Math.max(...allDates, lastSyncedDate.getTime()))
      : lastSyncedDate
  const maxId = leadIds.length > 0 ? Math.max(...leadIds) : null

  // Batch create
  if (leadsToCreate.length > 0) {
    const CREATE_CHUNK_SIZE = 1000
    for (let i = 0; i < leadsToCreate.length; i += CREATE_CHUNK_SIZE) {
      const chunk = leadsToCreate.slice(i, i + CREATE_CHUNK_SIZE)
      await prisma.lead.createMany({ data: chunk, skipDuplicates: true })
    }
    console.log(`   ✅ Created ${leadsToCreate.length} new leads`)
  }

  // Batch update
  if (leadsToUpdate.length > 0) {
    const UPDATE_CHUNK_SIZE = 25
    let updated = 0
    for (let i = 0; i < leadsToUpdate.length; i += UPDATE_CHUNK_SIZE) {
      const chunk = leadsToUpdate.slice(i, i + UPDATE_CHUNK_SIZE)
      try {
        await prisma.$transaction(
          chunk.map((item) => prisma.lead.update({ where: { leadRef: item.leadRef }, data: item.data }))
        )
        updated += chunk.length
      } catch {
        for (const item of chunk) {
          try {
            await prisma.lead.update({ where: { leadRef: item.leadRef }, data: item.data })
            updated++
          } catch (e) {
            console.error(`❌ Failed to update lead ${item.leadRef}:`, e)
          }
        }
      }
    }
    console.log(`   🔄 Updated ${updated} existing leads`)
  }

  // Remarks
  if (syncedLeadIds.length > 0) {
    await syncLeadRemarks(syncedLeadIds)
  }

  // Persist sync state
  await updateSyncState(maxDate, maxId, syncedCount + updatedCount)

  console.log(`   📊 Batch result: +${syncedCount} created, ${updatedCount} updated, ${errorCount} errors  (total so far: ${totalSyncedSoFar + syncedCount + updatedCount})`)

  return { fetched: leads.length, maxDate, maxId, synced: syncedCount, updated: updatedCount, errors: errorCount }
}

/**
 * Main sync function — loops through batches until all leads are synced.
 * Usage: bun run scripts/sync-mysql-leads.ts [--from YYYY-MM-DD]
 */
async function syncLeads() {
  const startTime = Date.now()
  const fromDate = parseFromArg()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[${new Date().toISOString()}] 🔄 Starting MySQL lead sync...`)
  if (fromDate) console.log(`   --from override: ${fromDate.toISOString().slice(0, 10)}`)
  console.log(`${'='.repeat(60)}`)

  try {
    console.log('📡 Testing MySQL connection...')
    const isConnected = await testMySQLConnection()
    if (!isConnected) throw new Error('Failed to connect to MySQL database')
    console.log('✅ MySQL connection established')

    // If --from is given, reset sync state to that date
    if (fromDate) {
      await prisma.syncState.upsert({
        where: { sourceType: SYNC_SOURCE_TYPE },
        update: { lastSyncedDate: fromDate, lastSyncedId: null, recordsCount: 0, lastRunAt: new Date() },
        create: { sourceType: SYNC_SOURCE_TYPE, lastSyncedDate: fromDate, lastSyncedId: null, recordsCount: 0, lastRunAt: new Date() },
      })
      console.log(`📅 Sync state reset to ${fromDate.toISOString().slice(0, 10)}`)
    }

    let systemUser = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } })
    if (!systemUser) systemUser = await prisma.user.findFirst()
    if (!systemUser) throw new Error('No users found in system. Cannot process leads.')

    let totalSynced = 0
    let totalUpdated = 0
    let totalErrors = 0
    let batchNum = 0

    // Loop: keep fetching batches until MySQL returns fewer than BATCH_SIZE rows
    while (true) {
      batchNum++
      const syncState = await getSyncState()
      console.log(`\n--- Batch ${batchNum} (from ${syncState.lastSyncedDate.toISOString().slice(0, 10)}) ---`)

      const result = await syncOneBatch(syncState.lastSyncedDate, systemUser.id, totalSynced + totalUpdated)
      totalSynced += result.synced
      totalUpdated += result.updated
      totalErrors += result.errors

      if (result.fetched < BATCH_SIZE) {
        console.log('\nAll batches processed.')
        break
      }
    }

    const seconds = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ Sync completed in ${seconds}s  (${batchNum} batch(es))`)
    console.log(`   Created: ${totalSynced}  |  Updated: ${totalUpdated}  |  Errors: ${totalErrors}`)
    console.log(`${'='.repeat(60)}\n`)
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  } finally {
    await closeMySQLPool()
    await prisma.$disconnect()
  }
}

syncLeads()
  .then(() => { process.exit(0) })
  .catch((error) => {
    console.error('\n❌ Sync script failed:', error)
    process.exit(1)
  })
