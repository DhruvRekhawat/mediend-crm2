import 'dotenv/config'
import { queryMySQL, closeMySQLPool, testMySQLConnection } from '@/lib/mysql-source-client'
import { prisma } from '@/lib/prisma'
import { mapMySQLLeadToPrisma, type MySQLLeadRow } from '@/lib/sync/mysql-lead-mapper'
import { UserRole } from '@prisma/client'
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

const BATCH_SIZE = 2500 // Increased batch size for better performance
const SYNC_SOURCE_TYPE = 'mysql_leads'
const CONCURRENCY_LIMIT = 15 // Process 15 leads concurrently

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
 * Main sync function
 */
async function syncLeads() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[${timestamp}] 🔄 Starting MySQL lead sync...`)
  console.log(`${'='.repeat(60)}`)

  try {
    // Test MySQL connection
    console.log('📡 Testing MySQL connection...')
    const isConnected = await testMySQLConnection()
    if (!isConnected) {
      throw new Error('Failed to connect to MySQL database')
    }
    console.log('✅ MySQL connection established')

    // Get sync state
    const syncState = await getSyncState()
    const lastSyncedDate = syncState.lastSyncedDate
    console.log(`📅 Last synced date: ${lastSyncedDate.toISOString()}`)
    console.log(`📊 Total records synced so far: ${syncState.recordsCount}`)

    // Get system user for created/updated by fields
    let systemUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    })
    if (!systemUser) {
      systemUser = await prisma.user.findFirst()
      if (!systemUser) {
        throw new Error('No users found in system. Cannot process leads.')
      }
    }

    // Fetch leads from MySQL
    console.log(`\n📥 Fetching leads from MySQL (batch size: ${BATCH_SIZE})...`)
    const leads = await queryMySQL<MySQLLeadRow>(
      `SELECT * FROM lead 
       WHERE Lead_Date >= ? 
       ORDER BY Lead_Date ASC, id ASC 
       LIMIT ?`,
      [lastSyncedDate, BATCH_SIZE]
    )

    console.log(`✅ Found ${leads.length} leads to sync`)
    if (leads.length > 0) {
      const dateRange = {
        earliest: leads[0].Lead_Date ? new Date(leads[0].Lead_Date).toISOString() : 'N/A',
        latest: leads[leads.length - 1].Lead_Date ? new Date(leads[leads.length - 1].Lead_Date).toISOString() : 'N/A',
      }
      console.log(`   Date range: ${dateRange.earliest} to ${dateRange.latest}`)
      console.log(`   Lead IDs: ${leads[0].id} to ${leads[leads.length - 1].id}`)
    }

    if (leads.length === 0) {
      console.log('ℹ️  No new leads to sync')
      return
    }

    // Pre-fetch existing leads with key fields for comparison
    console.log(`\n🔍 Pre-fetching existing leads (${leads.length} lead refs)...`)
    const leadRefs = leads.map((l) => String(l.id))
    const existingLeadsMap = await fetchExistingLeads(leadRefs)
    console.log(`✅ Found ${existingLeadsMap.size} existing leads out of ${leads.length} (${leads.length - existingLeadsMap.size} new)`)

    // Pre-fetch BD users map for faster lookups
    console.log('👥 Pre-fetching BD users...')
    const bdUsersMap = await fetchBDUsersMap()
    console.log(`✅ Loaded ${bdUsersMap.size} BD user lookup entries`)

    // Process leads in parallel with concurrency limit
    const limit = pLimit(CONCURRENCY_LIMIT)
    let syncedCount = 0
    let updatedCount = 0
    let errorCount = 0
    const syncedLeadIds: number[] = []
    const leadsToCreate: any[] = []
    const leadsToUpdate: Array<{ leadRef: string; data: any }> = []
    const leadDates: Date[] = []
    const leadIds: number[] = []

    console.log(`\n⚙️  Processing ${leads.length} leads with concurrency limit of ${CONCURRENCY_LIMIT}...`)

    // Process each lead in parallel
    const processLead = async (mysqlLead: MySQLLeadRow) => {
      try {
        const leadRef = String(mysqlLead.id)
        const leadDate = mysqlLead.Lead_Date ? new Date(mysqlLead.Lead_Date) : new Date()

        // Track dates and IDs for max calculation after processing
        leadDates.push(leadDate)
        leadIds.push(mysqlLead.id)

        // Map MySQL lead to Prisma format
        // Note: mapMySQLLeadToPrisma already handles BD user lookup and creation
        const leadData = await mapMySQLLeadToPrisma(mysqlLead, systemUser.id)

        // Verify BD user exists (mapMySQLLeadToPrisma should have handled this, but double-check)
        if (!leadData.bdId) {
          console.warn(`⚠️  Lead ${leadRef} has no bdId, skipping`)
          errorCount++
          return
        }

        // Extract updatedDate and prepare data for Prisma
        const { updatedDate, ...leadDataForPrisma } = leadData

        const existingLead = existingLeadsMap.get(leadRef)

        if (existingLead) {
          // Check if lead has actually changed by comparing key fields
          const hasChanged =
            existingLead.patientName !== leadDataForPrisma.patientName ||
            existingLead.status !== leadDataForPrisma.status ||
            existingLead.bdId !== leadDataForPrisma.bdId ||
            (updatedDate && existingLead.updatedDate && updatedDate.getTime() !== existingLead.updatedDate.getTime()) ||
            (!existingLead.updatedDate && updatedDate)

          if (hasChanged) {
            // Only queue for update if data has changed
            leadsToUpdate.push({
              leadRef,
              data: leadDataForPrisma,
            })
            updatedCount++
            syncedLeadIds.push(mysqlLead.id)
          }
          // If unchanged, skip this lead entirely
        } else {
          // Queue for batch create (new lead)
          leadsToCreate.push(leadDataForPrisma)
          syncedCount++
          syncedLeadIds.push(mysqlLead.id)
        }

      } catch (error) {
        errorCount++
        console.error(`Error processing lead ${mysqlLead.id}:`, error)
      }
    }

    // Process all leads in parallel with concurrency limit
    await Promise.allSettled(leads.map((lead) => limit(() => processLead(lead))))

    // Calculate max date and ID after processing
    const maxDate = leadDates.length > 0 ? new Date(Math.max(...leadDates.map(d => d.getTime()))) : lastSyncedDate
    const maxId = leadIds.length > 0 ? Math.max(...leadIds) : null

    console.log(`\n📊 Processing summary:`)
    console.log(`   ✅ New leads to create: ${syncedCount}`)
    console.log(`   🔄 Leads to update: ${updatedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)

    // Batch create new leads
    if (leadsToCreate.length > 0) {
      console.log(`\n➕ Batch creating ${leadsToCreate.length} new leads...`)
      // Prisma createMany has a limit, so chunk it
      const CREATE_CHUNK_SIZE = 1000
      let created = 0
      for (let i = 0; i < leadsToCreate.length; i += CREATE_CHUNK_SIZE) {
        const chunk = leadsToCreate.slice(i, i + CREATE_CHUNK_SIZE)
        await prisma.lead.createMany({
          data: chunk,
          skipDuplicates: true,
        })
        created += chunk.length
        if (i + CREATE_CHUNK_SIZE < leadsToCreate.length) {
          console.log(`   Progress: ${created}/${leadsToCreate.length} leads created...`)
        }
      }
      console.log(`✅ Created ${leadsToCreate.length} new leads`)
    }

    // Batch update existing leads - process sequentially in smaller batches
    if (leadsToUpdate.length > 0) {
      console.log(`\n🔄 Batch updating ${leadsToUpdate.length} existing leads...`)
      // Process in smaller chunks sequentially to avoid transaction timeouts
      // Process updates one by one or in very small batches
      const UPDATE_CHUNK_SIZE = 25 // Very small chunks to avoid timeouts
      let updated = 0
      for (let i = 0; i < leadsToUpdate.length; i += UPDATE_CHUNK_SIZE) {
        const chunk = leadsToUpdate.slice(i, i + UPDATE_CHUNK_SIZE)
        // Process updates in a transaction, but with smaller chunks
        // Note: Prisma array transaction doesn't support timeout options
        // The timeout is controlled by the database connection pool
        try {
          await prisma.$transaction(
            chunk.map((item) =>
              prisma.lead.update({
                where: { leadRef: item.leadRef },
                data: item.data,
              })
            )
          )
          updated += chunk.length
        } catch (error) {
          // If transaction fails, process individually
          console.warn(`⚠️  Transaction failed for chunk starting at ${i}, processing individually...`)
          for (const item of chunk) {
            try {
              await prisma.lead.update({
                where: { leadRef: item.leadRef },
                data: item.data,
              })
              updated++
            } catch (individualError) {
              console.error(`❌ Failed to update lead ${item.leadRef}:`, individualError)
            }
          }
        }
        if ((i + UPDATE_CHUNK_SIZE) % 250 === 0 || i + UPDATE_CHUNK_SIZE >= leadsToUpdate.length) {
          console.log(`   Progress: ${updated}/${leadsToUpdate.length} leads updated...`)
        }
      }
      console.log(`✅ Updated ${leadsToUpdate.length} existing leads`)
    }

    // Sync lead remarks for synced leads
    if (syncedLeadIds.length > 0) {
      console.log(`\n💬 Syncing lead remarks for ${syncedLeadIds.length} leads...`)
      await syncLeadRemarks(syncedLeadIds)
    }

    // Update sync state
    await updateSyncState(maxDate, maxId, syncedCount + updatedCount)

    const executionTime = Date.now() - startTime
    const executionTimeSeconds = (executionTime / 1000).toFixed(2)

    console.log(`\n${'='.repeat(60)}`)
    console.log(`✅ Sync completed successfully`)
    console.log(`${'='.repeat(60)}`)
    console.log(`📈 Statistics:`)
    console.log(`   • New leads: ${syncedCount}`)
    console.log(`   • Updated leads: ${updatedCount}`)
    console.log(`   • Errors: ${errorCount}`)
    console.log(`   • Total processed: ${syncedCount + updatedCount}`)
    console.log(`\n📅 Sync state:`)
    console.log(`   • Last synced date: ${maxDate.toISOString()}`)
    console.log(`   • Last synced ID: ${maxId}`)
    console.log(`   • Total records synced: ${syncState.recordsCount + syncedCount + updatedCount}`)
    console.log(`\n⏱️  Execution time: ${executionTimeSeconds}s`)
    console.log(`${'='.repeat(60)}\n`)
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  } finally {
    await closeMySQLPool()
    await prisma.$disconnect()
  }
}

// Run sync
syncLeads()
  .then(() => {
    console.log('✅ Sync script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Sync script failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  })
