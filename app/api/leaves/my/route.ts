import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getComputedBalancesForEmployee } from '@/lib/hrms/leave-policy-calculator'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const [leaveRequests, balances] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
        },
        include: {
          leaveType: true,
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      getComputedBalancesForEmployee(employee.id),
    ])

    return successResponse({
      requests: leaveRequests,
      balances: balances.map((b) => ({
        id: b.leaveTypeId,
        leaveTypeId: b.leaveTypeId,
        leaveTypeName: b.leaveTypeName,
        allocated: b.allocated,
        used: b.used,
        remaining: b.remaining,
        locked: b.locked,
        isProbation: b.isProbation,
        carryForward: b.carryForward,
        leaveType: {
          id: b.leaveTypeId,
          name: b.leaveTypeName,
          maxDays: Math.ceil(b.allocated + b.locked),
        },
      })),
    })
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return errorResponse('Failed to fetch leaves', 500)
  }
}

