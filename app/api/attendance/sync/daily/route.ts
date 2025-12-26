import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { fetchAttendanceLogs } from '@/lib/hrms/biometric-api-client'
import { normalizePunchDirection } from '@/lib/hrms/attendance-utils'
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

        // Parse log date from IOTime
        const logDate = new Date(log.IOTime)
        if (isNaN(logDate.getTime())) {
          errors++
          continue
        }

        // Normalize punch direction from IOMode
        const punchDirection = normalizePunchDirection(log.IOMode)

        // Check for duplicate
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

