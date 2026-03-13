import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { getComputedBalancesForEmployee } from '@/lib/hrms/leave-policy-calculator'

function isInProbation(joinDate: Date | null): boolean {
  if (!joinDate) return false
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return new Date(joinDate) > sixMonthsAgo
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!hasPermission(user, 'hrms:employees:write') && !hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const employees = await prisma.employee.findMany({
      where: {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    const list = await Promise.all(
      employees.map(async (emp) => {
        const balances = await getComputedBalancesForEmployee(emp.id)
        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: emp.user.name,
          email: emp.user.email,
          department: emp.department?.name ?? null,
          joinDate: emp.joinDate,
          inProbation: balances[0]?.isProbation ?? isInProbation(emp.joinDate),
          balances: balances.map((b) => ({
            id: b.leaveTypeId,
            leaveTypeId: b.leaveTypeId,
            leaveTypeName: b.leaveTypeName,
            allocated: b.allocated,
            used: b.used,
            remaining: b.remaining,
            locked: b.locked,
            carryForward: b.carryForward,
          })),
        }
      })
    )

    return successResponse(list)
  } catch (error) {
    console.error('Error fetching leave balances:', error)
    return errorResponse('Failed to fetch leave balances', 500)
  }
}
