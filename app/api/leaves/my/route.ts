import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { initializeLeaveBalances } from '@/lib/hrms/leave-balance-utils'

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

    // Initialize leave balances if they don't exist
    const existingBalances = await prisma.leaveBalance.count({
      where: { employeeId: employee.id },
    })

    if (existingBalances === 0) {
      await initializeLeaveBalances(employee.id)
    }

    const [leaveRequests, leaveBalances] = await Promise.all([
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
      prisma.leaveBalance.findMany({
        where: {
          employeeId: employee.id,
        },
        include: {
          leaveType: true,
        },
      }),
    ])

    return successResponse({
      requests: leaveRequests,
      balances: leaveBalances,
    })
  } catch (error) {
    console.error('Error fetching leaves:', error)
    return errorResponse('Failed to fetch leaves', 500)
  }
}

