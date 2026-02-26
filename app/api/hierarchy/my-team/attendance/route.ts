import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getEmployeeByUserId, getSubordinates } from '@/lib/hierarchy'
import { groupAttendanceByDate } from '@/lib/hrms/attendance-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hierarchy:team:read')) {
      return errorResponse('Forbidden', 403)
    }

    const employee = await getEmployeeByUserId(user.id)
    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const subordinates = await getSubordinates(employee.id, true)
    const subordinateIds = subordinates.map((s) => s.id)
    if (subordinateIds.length === 0) {
      return successResponse({ entries: [], fromDate: null, toDate: null })
    }

    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const where: { employeeId: { in: string[] }; logDate?: { gte?: Date; lte?: Date } } = {
      employeeId: { in: subordinateIds },
    }
    if (fromDate) {
      const [y, m, d] = fromDate.split('-').map(Number)
      where.logDate = { ...where.logDate, gte: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)) }
    }
    if (toDate) {
      const [y, m, d] = toDate.split('-').map(Number)
      where.logDate = { ...where.logDate, lte: new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)) }
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    })

    const byEmployee = new Map<string, typeof logs>()
    for (const log of logs) {
      const list = byEmployee.get(log.employeeId) ?? []
      list.push(log)
      byEmployee.set(log.employeeId, list)
    }

    const entries = Array.from(byEmployee.entries()).map(([empId, empLogs]) => {
      const emp = empLogs[0]?.employee
      const grouped = groupAttendanceByDate(empLogs)
      return {
        employeeId: empId,
        name: emp?.user.name ?? '',
        email: emp?.user.email ?? '',
        role: emp?.user.role ?? '',
        attendance: grouped,
      }
    })

    return successResponse({
      entries,
      fromDate: fromDate ?? null,
      toDate: toDate ?? null,
    })
  } catch (error) {
    console.error('Error fetching team attendance:', error)
    return errorResponse('Failed to fetch team attendance', 500)
  }
}
