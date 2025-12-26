/**
 * Historic Attendance Sync Script
 * 
 * This script syncs attendance data from December 1st to today.
 * Run once to populate historic data: npx tsx scripts/sync-historic-attendance.ts
 */

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import { fetchAttendanceLogs } from '@/lib/hrms/biometric-api-client'
import { normalizePunchDirection } from '@/lib/hrms/attendance-utils'
import { format } from 'date-fns'

const { Pool } = pkg

// Prisma client will be created after env vars are loaded
let prisma: PrismaClient
let pool: InstanceType<typeof Pool>



async function syncHistoricAttendance() {
  try {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ Error: DATABASE_URL environment variable is not set.')
      console.error('   Please make sure you have a .env file with DATABASE_URL configured.')
      process.exit(1)
    }

    // Create Prisma client with connection pool
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })

    // Calculate date range: December 1st to today
    const today = new Date()
    const decemberFirst = new Date(today.getFullYear(), 11, 1) // Month is 0-indexed, so 11 = December
    
    const fromDate = format(decemberFirst, 'yyyy-MM-dd')
    const toDate = format(today, 'yyyy-MM-dd')

    console.log(`🔄 Starting historic attendance sync from ${fromDate} to ${toDate}`)

    // Get all employees with their codes
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    const employeeCodeMap = new Map(employees.map((e) => [e.employeeCode, e.id]))
    console.log(`📋 Found ${employees.length} employees in database`)

    // Create or get "Unknown" employee for unmatched employee codes
    // This allows us to store all attendance data, even if employee codes don't match yet
    let unknownEmployeeId: string | null = null
    
    // Try to find an existing "Unknown" employee
    const unknownEmployee = await prisma.employee.findFirst({
      where: {
        employeeCode: 'UNKNOWN',
      },
    })

    if (unknownEmployee) {
      unknownEmployeeId = unknownEmployee.id
      console.log('📝 Using existing "Unknown" employee for unmatched codes')
    } else {
      // Create a temporary "Unknown" user and employee
      const unknownUser = await prisma.user.create({
        data: {
          email: `unknown-${Date.now()}@temp.local`,
          passwordHash: 'temp', // Temporary, won't be used
          name: 'Unknown Employee',
          role: 'BD', // Default role
        },
      })

      const unknownEmployeeRecord = await prisma.employee.create({
        data: {
          userId: unknownUser.id,
          employeeCode: 'UNKNOWN',
        },
      })
      
      unknownEmployeeId = unknownEmployeeRecord.id
      employeeCodeMap.set('UNKNOWN', unknownEmployeeId)
      console.log('📝 Created "Unknown" employee for unmatched codes')
      console.log('   ⚠️  Note: Attendance logs with unmatched codes will be assigned to this employee')
      console.log('   You can update employeeId later when employee codes are added')
    }

    // Fetch attendance logs from API
    console.log('📡 Fetching attendance logs from API...')
    const logs = await fetchAttendanceLogs(fromDate, toDate)
    console.log(`✅ Fetched ${logs.length} logs from API`)

    // Debug: Show sample employee codes from API
    if (logs.length > 0) {
      const uniqueEmpCodes = new Set(logs.map((log) => log.EmpCode).filter(Boolean))
      console.log(`📝 Found ${uniqueEmpCodes.size} unique employee codes in API logs:`)
      Array.from(uniqueEmpCodes).slice(0, 10).forEach((code) => {
        console.log(`   - ${code}`)
      })
      if (uniqueEmpCodes.size > 10) {
        console.log(`   ... and ${uniqueEmpCodes.size - 10} more`)
      }
    }

    if (logs.length === 0) {
      console.log('ℹ️  No attendance logs found in the specified date range.')
      console.log('   This is normal if there is no attendance data for this period.')
      return
    }

    let processed = 0
    let skipped = 0
    let errors = 0
    let unmatched = 0

    // Process each log
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`⏳ Processing ${i + 1}/${logs.length}...`)
      }

      try {
        // Handle invalid or empty employee codes
        let empCode = log.EmpCode?.trim() || ''
        if (!empCode || empCode === '0') {
          empCode = 'UNKNOWN'
        }

        // Try to find matching employee
        let employeeId = employeeCodeMap.get(empCode)
        
        // If not found, try case-insensitive match
        if (!employeeId) {
          for (const [code, id] of employeeCodeMap.entries()) {
            if (code.toLowerCase() === empCode.toLowerCase()) {
              employeeId = id
              break
            }
          }
        }

        // If still not found, use unknown employee (store all data)
        if (!employeeId) {
          employeeId = unknownEmployeeId!
          unmatched++
          // Store the original EmpCode in serialNumber for later matching
          // Format: "UNMATCHED:{EmpCode}|{DeviceKey}"
          const originalDeviceKey = log.DeviceKey || ''
          log.DeviceKey = `UNMATCHED:${empCode}${originalDeviceKey ? '|' + originalDeviceKey : ''}`
        }

        // Parse log date from IOTime
        const logDate = new Date(log.IOTime)
        if (isNaN(logDate.getTime())) {
          errors++
          continue
        }

        // Normalize punch direction from IOMode
        const punchDirection = normalizePunchDirection(log.IOMode)

        // Check for duplicate
        // Note: For unmatched logs (all using UNKNOWN employee), duplicates are still prevented
        // by the unique constraint on employeeId + logDate + punchDirection
        // Since IOTime includes milliseconds, it's very unlikely two different employees
        // would punch at the exact same millisecond
        const existing = await prisma.attendanceLog.findUnique({
          where: {
            employeeId_logDate_punchDirection: {
              employeeId,
              logDate,
              punchDirection,
            },
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Create attendance log
        await prisma.attendanceLog.create({
          data: {
            employeeId,
            logDate,
            punchDirection,
            temperature: 0, // Not available in new API
            serialNumber: log.DeviceKey || null,
          },
        })

        processed++
      } catch (error) {
        console.error(`❌ Error processing log ${log.Id}:`, error)
        errors++
      }
    }

    console.log('\n📊 Sync Summary:')
    console.log(`   ✅ Processed: ${processed}`)
    console.log(`   ⏭️  Skipped: ${skipped} (duplicates)`)
    console.log(`   🔍 Unmatched: ${unmatched} (stored with UNKNOWN employee)`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📦 Total: ${logs.length}`)
    
    if (unmatched > 0) {
      console.log('\n💡 Note: Unmatched logs are stored with employee code "UNKNOWN"')
      console.log('   The original employee code is stored in the serialNumber field')
      console.log('   You can update these logs later when employee codes are added to employees')
    }
    
    console.log('\n✨ Historic attendance sync completed!')
  } catch (error) {
    console.error('❌ Fatal error during sync:', error)
    process.exit(1)
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
    if (pool) {
      await pool.end()
    }
  }
}

// Run the script
syncHistoricAttendance()

