import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { fetchAttendanceLogs } from '@/lib/hrms/biometric-api-client'
import { normalizePunchDirection } from '@/lib/hrms/attendance-utils'
import { PunchDirection } from '@prisma/client'
import { format, subDays } from 'date-fns'

/**
 * Daily sync endpoint
 * 
 * This endpoint syncs attendance data for yesterday.
 * Can be called by cron jobs or scheduled tasks.
 * 
 * To secure this endpoint, you can:
 * 1. Add authentication via API key in headers
 * 2. Use Vercel Cron Jobs with secret verification
 * 3. Use environment variable check
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify API key or secret for security
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.ATTENDANCE_SYNC_SECRET
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return errorResponse('Unauthorized', 401)
    }

    // Sync yesterday's data
    const yesterday = subDays(new Date(), 1)
    const fromDate = format(yesterday, 'yyyy-MM-dd')
    const toDate = format(yesterday, 'yyyy-MM-dd')

    console.log(`🔄 Daily sync: Fetching attendance for ${fromDate}`)

    // Get all employees with their codes
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
      },
    })

    const employeeCodeMap = new Map(employees.map((e) => [e.employeeCode, e.id]))

    // Fetch attendance logs from API
    const logs = await fetchAttendanceLogs(fromDate, toDate)

    let processed = 0
    let skipped = 0
    let errors = 0

    // Process each log
    for (const log of logs) {
      try {
        // Skip invalid employee codes
        if (!log.EmpCode || log.EmpCode === '0' || log.EmpCode.trim() === '') {
          skipped++
          continue
        }

        const employeeId = employeeCodeMap.get(log.EmpCode)
        if (!employeeId) {
          skipped++
          continue
        }

        // Parse IOTime string.
        // IMPORTANT: `IOTime` already represents the correct IST wall-clock time coming from the device.
        // DO NOT do any timezone conversions. We store the timestamp exactly as provided.
        const iotimeMatch = log.IOTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
        if (!iotimeMatch) {
          console.error(`Invalid IOTime format: ${log.IOTime}`)
          errors++
          continue
        }
        
        const [, year, month, day, hour, minute, second] = iotimeMatch.map(Number)

        // Store as-is (no conversion).
        // We intentionally create a UTC timestamp with the same clock components so rendering
        // can also use UTC and show the same HH:mm the API provided.
        const logDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
        
        if (isNaN(logDate.getTime())) {
          console.error(`Invalid date created from IOTime: ${log.IOTime}`)
          errors++
          continue
        }

        // Normalize punch direction from IOMode
        let punchDirection = normalizePunchDirection(log.IOMode)

        // Fix: If this is an IN entry, check if there's already an IN log for this employee on this day
        // If yes, treat this second IN entry as OUT (biometric device sometimes marks exits as "in")
        if (punchDirection === PunchDirection.IN) {
          const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
          
          const existingInLog = await prisma.attendanceLog.findFirst({
            where: {
              employeeId,
              logDate: {
                gte: dayStart,
                lte: dayEnd,
              },
              punchDirection: PunchDirection.IN,
            },
          })
          
          if (existingInLog) {
            // This is a second IN entry, treat it as OUT
            punchDirection = PunchDirection.OUT
          }
        }

        // Check for duplicate (using the corrected punch direction)
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
        console.error('Error processing attendance log:', error)
        errors++
      }
    }

    return successResponse({
      date: fromDate,
      processed,
      skipped,
      errors,
      total: logs.length,
    })
  } catch (error) {
    console.error('Error in daily sync:', error)
    return errorResponse('Failed to sync attendance', 500)
  }
}

// Also support GET for easier cron job setup
export async function GET(request: NextRequest) {
  return POST(request)
}

