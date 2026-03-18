import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const manager = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!manager) {
      return errorResponse('Employee record not found', 404)
    }

    const list = await prisma.attendanceNormalization.findMany({
      where: {
        type: 'EMPLOYEE_REQUEST',
        status: 'PENDING',
        managerApprovedAt: null,
        employee: {
          managerId: manager.id,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            user: { select: { name: true, email: true } },
          },
        },
        requestedBy: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = list.map((n) => ({
      id: n.id,
      employeeId: n.employeeId,
      date: n.date.toISOString().split('T')[0],
      reason: n.reason,
      createdAt: n.createdAt.toISOString(),
      employee: n.employee,
      requestedBy: n.requestedBy?.user?.name ?? null,
    }))

    return successResponse({ list: formatted })
  } catch (error) {
    console.error('Error fetching team normalization requests:', error)
    return errorResponse('Failed to fetch requests', 500)
  }
}
