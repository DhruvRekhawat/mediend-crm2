import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { fetchAttendanceLogs } from '@/lib/hrms/biometric-api-client'
import { normalizePunchDirection } from '@/lib/hrms/attendance-utils'
import { PunchDirection } from '@prisma/client'
import { z } from 'zod'

const syncSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:attendance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { fromDate, toDate } = syncSchema.parse(body)

    // Fetch attendance logs from biometric API
    const logs = await fetchAttendanceLogs(fromDate, toDate)

    // Get all employees with their codes
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeCode: true,
      },
    })

    const employeeCodeMap = new Map(employees.map((e) => [e.employeeCode, e.id]))

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
      processed,
      skipped,
      errors,
      total: logs.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error syncing attendance:', error)
    return errorResponse('Failed to sync attendance', 500)
  }
}

