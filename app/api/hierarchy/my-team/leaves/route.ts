import { NextRequest } from 'next/server'
import { LeaveRequestStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getEmployeeByUserId, getSubordinates } from '@/lib/hierarchy'

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
      return successResponse({ leaves: [] })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') // PENDING | APPROVED | REJECTED

    const validStatuses: LeaveRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
    const status = statusParam && validStatuses.includes(statusParam as LeaveRequestStatus)
      ? (statusParam as LeaveRequestStatus)
      : undefined

    const where = {
      employeeId: { in: subordinateIds },
      ...(status && { status }),
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        leaveType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse({
      leaves: leaves.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: l.employee.user.name,
        employeeEmail: l.employee.user.email,
        leaveType: l.leaveType.name,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        reason: l.reason,
        status: l.status,
        approvedAt: l.approvedAt,
        createdAt: l.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching team leaves:', error)
    return errorResponse('Failed to fetch team leaves', 500)
  }
}
