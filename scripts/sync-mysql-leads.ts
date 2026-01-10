// import 'dotenv/config'
// import { queryMySQL, closeMySQLPool, testMySQLConnection } from '@/lib/mysql-source-client'
// import { prisma } from '@/lib/prisma'
// import { mapMySQLLeadToPrisma } from '@/lib/sync/mysql-lead-mapper'
// import { UserRole } from '@prisma/client'

// interface MySQLLeadRow {
//   id: number
//   [key: string]: any
// }

// interface MySQLRemarkRow {
//   id: number
//   RefId: number
//   Remarks: string
//   UpdateBy: number | null
//   UpdateDate: Date | string
//   IP: string | null
//   LeadStatus: number | null
// }

// const BATCH_SIZE = 2500 // Increased batch size for better performance
// const SYNC_SOURCE_TYPE = 'mysql_leads'

// /**
//  * Get or create sync state
//  */
// async function getSyncState() {
//   let syncState = await prisma.syncState.findUnique({
//     where: { sourceType: SYNC_SOURCE_TYPE },
//   })

//   if (!syncState) {
//     // Initialize with a default date (e.g., 1 day ago if no state exists)
//     const defaultDate = new Date()
//     defaultDate.setDate(defaultDate.getDate() - 1)

//     syncState = await prisma.syncState.create({
//       data: {
//         sourceType: SYNC_SOURCE_TYPE,
//         lastSyncedDate: defaultDate,
//         lastSyncedId: null,
//         recordsCount: 0,
//         lastRunAt: new Date(),
//       },
//     })
//   }

//   return syncState
// }

// /**
//  * Update sync state
//  */
// async function updateSyncState(
//   lastSyncedDate: Date,
//   lastSyncedId: number | null,
//   recordsCount: number
// ) {
//   await prisma.syncState.upsert({
//     where: { sourceType: SYNC_SOURCE_TYPE },
//     update: {
//       lastSyncedDate,
//       lastSyncedId,
//       recordsCount: {
//         increment: recordsCount,
//       },
//       lastRunAt: new Date(),
//     },
//     create: {
//       sourceType: SYNC_SOURCE_TYPE,
//       lastSyncedDate,
//       lastSyncedId,
//       recordsCount,
//       lastRunAt: new Date(),
//     },
//   })
// }

// /**
//  * Sync lead remarks for a batch of lead IDs
//  */
// async function syncLeadRemarks(leadIds: number[]) {
//   if (leadIds.length === 0) return

//   try {
//     const remarks = await queryMySQL<MySQLRemarkRow>(
//       `SELECT * FROM lead_remarks WHERE RefId IN (${leadIds.map(() => '?').join(',')}) ORDER BY UpdateDate`,
//       leadIds
//     )

//     let syncedCount = 0

//     for (const remark of remarks) {
//       try {
//         const leadRef = String(remark.RefId)

//         // Check if lead exists
//         const lead = await prisma.lead.findUnique({
//           where: { leadRef },
//         })

//         if (!lead) {
//           console.warn(`Lead ${leadRef} not found for remark ${remark.id}, skipping`)
//           continue
//         }

//         // Check if remark already exists (by checking updateDate and remarks content)
//         const existingRemark = await prisma.leadRemark.findFirst({
//           where: {
//             leadRef,
//             updateDate: new Date(remark.UpdateDate),
//             remarks: remark.Remarks,
//           },
//         })

//         if (existingRemark) {
//           continue // Skip duplicate
//         }

//         await prisma.leadRemark.create({
//           data: {
//             leadRef,
//             remarks: remark.Remarks,
//             updateBy: remark.UpdateBy ?? null,
//             updateDate: new Date(remark.UpdateDate),
//             ip: remark.IP ?? null,
//             leadStatus: remark.LeadStatus ?? null,
//           },
//         })

//         syncedCount++
//       } catch (error) {
//         console.error(`Error syncing remark ${remark.id}:`, error)
//       }
//     }

//     if (syncedCount > 0) {
//       console.log(`Synced ${syncedCount} lead remarks`)
//     }
//   } catch (error) {
//     console.error('Error syncing lead remarks:', error)
//   }
// }

// /**
//  * Main sync function
//  */
// async function syncLeads() {
//   console.log(`[${new Date().toISOString()}] Starting MySQL lead sync...`)

//   try {
//     // Test MySQL connection
//     const isConnected = await testMySQLConnection()
//     if (!isConnected) {
//       throw new Error('Failed to connect to MySQL database')
//     }
//     console.log('MySQL connection established')

//     // Get sync state
//     const syncState = await getSyncState()
//     const lastSyncedDate = syncState.lastSyncedDate
//     console.log(`Last synced date: ${lastSyncedDate.toISOString()}`)

//     // Get system user for created/updated by fields
//     let systemUser = await prisma.user.findFirst({
//       where: { role: UserRole.ADMIN },
//     })
//     if (!systemUser) {
//       systemUser = await prisma.user.findFirst()
//       if (!systemUser) {
//         throw new Error('No users found in system. Cannot process leads.')
//       }
//     }

//     // Fetch leads from MySQL
//     const leads = await queryMySQL<MySQLLeadRow>(
//       `SELECT * FROM lead 
//        WHERE Lead_Date >= ? 
//        ORDER BY Lead_Date ASC, id ASC 
//        LIMIT ?`,
//       [lastSyncedDate, BATCH_SIZE]
//     )

//     console.log(`Found ${leads.length} leads to sync`)

//     if (leads.length === 0) {
//       console.log('No new leads to sync')
//       return
//     }

//     let syncedCount = 0
//     let updatedCount = 0
//     let errorCount = 0
//     let maxDate = lastSyncedDate
//     let maxId: number | null = null
//     const syncedLeadIds: number[] = []

//     // Process each lead
//     for (const mysqlLead of leads) {
//       try {
//         const leadRef = String(mysqlLead.id)
//         const leadDate = mysqlLead.Lead_Date
//           ? new Date(mysqlLead.Lead_Date)
//           : new Date()

//         // Track max date and ID
//         if (leadDate > maxDate) {
//           maxDate = leadDate
//         }
//         if (maxId === null || mysqlLead.id > maxId) {
//           maxId = mysqlLead.id
//         }

//         // Map MySQL lead to Prisma format
//         const leadData = await mapMySQLLeadToPrisma(mysqlLead, systemUser.id)

//         // Verify BD user exists before creating lead
//         if (leadData.bdId) {
//           const bdUserExists = await prisma.user.findUnique({
//             where: { id: leadData.bdId },
//             select: { id: true },
//           })

//           if (!bdUserExists) {
//             console.warn(`BD user ${leadData.bdId} does not exist for lead ${leadRef}, skipping`)
//             errorCount++
//             continue
//           }
//         } else {
//           console.warn(`Lead ${leadRef} has no bdId, skipping`)
//           errorCount++
//           continue
//         }

//         // Check if lead exists
//         const existingLead = await prisma.lead.findUnique({
//           where: { leadRef },
//         })

//         // Extract bdId and prepare data for Prisma
//         const { bdId, ...leadDataWithoutBdId } = leadData
        
//         if (existingLead) {
//           // Update existing lead - bdId is verified to exist above
//           await prisma.lead.update({
//             where: { leadRef },
//             data: {
//               ...leadDataWithoutBdId,
//               bdId, // Use bdId directly for updates
//             },
//           })
//           updatedCount++
//         } else {
//           // Create new lead - use relation syntax to ensure BD connection
//           await prisma.lead.create({
//             data: {
//               ...leadDataWithoutBdId,
//               bd: {
//                 connect: { id: bdId },
//               },
//             },
//           })
//           syncedCount++
//         }

//         syncedLeadIds.push(mysqlLead.id)
//       } catch (error) {
//         errorCount++
//         console.error(`Error processing lead ${mysqlLead.id}:`, error)
//       }
//     }

//     // Sync lead remarks for synced leads
//     if (syncedLeadIds.length > 0) {
//       await syncLeadRemarks(syncedLeadIds)
//     }

//     // Update sync state
//     await updateSyncState(maxDate, maxId, syncedCount + updatedCount)

//     console.log(`\nSync completed:`)
//     console.log(`  - New leads: ${syncedCount}`)
//     console.log(`  - Updated leads: ${updatedCount}`)
//     console.log(`  - Errors: ${errorCount}`)
//     console.log(`  - Last synced date: ${maxDate.toISOString()}`)
//     console.log(`  - Last synced ID: ${maxId}`)
//   } catch (error) {
//     console.error('Sync failed:', error)
//     throw error
//   } finally {
//     await closeMySQLPool()
//     await prisma.$disconnect()
//   }
// }

// // Run sync
// syncLeads()
//   .then(() => {
//     console.log('Sync script completed successfully')
//     process.exit(0)
//   })
//   .catch((error) => {
//     console.error('Sync script failed:', error)
//     process.exit(1)
//   })
