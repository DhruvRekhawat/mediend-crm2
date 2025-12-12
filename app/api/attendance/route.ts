import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { groupAttendanceByDate } from '@/lib/hrms/attendance-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:attendance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const departmentId = searchParams.get('departmentId')
    const employeeId = searchParams.get('employeeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (fromDate || toDate) {
      where.logDate = {}
      if (fromDate) {
        where.logDate.gte = new Date(fromDate)
      }
      if (toDate) {
        const endDate = new Date(toDate)
        endDate.setHours(23, 59, 59, 999)
        where.logDate.lte = endDate
      }
    }

    if (employeeId) {
      where.employeeId = employeeId
    } else if (departmentId) {
      const employees = await prisma.employee.findMany({
        where: { departmentId },
        select: { id: true },
      })
      where.employeeId = {
        in: employees.map((e) => e.id),
      }
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        include: {
          employee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          logDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendanceLog.count({ where }),
    ])

    // Group by employee and date for better presentation
    const employeeMap = new Map<string, any>()
    
    for (const log of logs) {
      const key = `${log.employeeId}_${log.logDate.toISOString().split('T')[0]}`
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employee: log.employee,
          date: log.logDate.toISOString().split('T')[0],
          logs: [],
        })
      }
      employeeMap.get(key)!.logs.push(log)
    }

    const grouped = Array.from(employeeMap.values()).map((item) => {
      const dayLogs = item.logs
      const inLog = dayLogs.find((l: any) => l.punchDirection === 'IN')
      const outLog = dayLogs.find((l: any) => l.punchDirection === 'OUT')
      
      let workHours = null
      if (inLog && outLog) {
        const diffMs = outLog.logDate.getTime() - inLog.logDate.getTime()
        workHours = diffMs / (1000 * 60 * 60)
      }

      const isLate = inLog ? (inLog.logDate.getHours() > 10 || (inLog.logDate.getHours() === 10 && inLog.logDate.getMinutes() > 0)) : false

      return {
        ...item,
        inTime: inLog?.logDate || null,
        outTime: outLog?.logDate || null,
        workHours,
        isLate,
      }
    })

    return successResponse({
      data: grouped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return errorResponse('Failed to fetch attendance', 500)
  }
}

