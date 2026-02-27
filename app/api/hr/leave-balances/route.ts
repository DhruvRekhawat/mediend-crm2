import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const PROBATION_MONTHS = 6

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
        leaveBalances: {
          include: { leaveType: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - PROBATION_MONTHS, now.getDate())

    const list = employees.map((emp) => {
      const inProbation = emp.joinDate ? new Date(emp.joinDate) > sixMonthsAgo : false
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.user.name,
        email: emp.user.email,
        department: emp.department?.name ?? null,
        joinDate: emp.joinDate,
        inProbation,
        balances: emp.leaveBalances.map((b) => ({
          id: b.id,
          leaveTypeId: b.leaveTypeId,
          leaveTypeName: b.leaveType.name,
          allocated: b.allocated,
          used: b.used,
          remaining: b.remaining,
        })),
      }
    })

    return successResponse(list)
  } catch (error) {
    console.error('Error fetching leave balances:', error)
    return errorResponse('Failed to fetch leave balances', 500)
  }
}

const patchSchema = z.object({
  employeeId: z.string(),
  leaveTypeId: z.string(),
  allocated: z.number().min(0).optional(),
  used: z.number().min(0).optional(),
  remaining: z.number().min(0).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }
    if (!hasPermission(user, 'hrms:employees:write') && !hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = patchSchema.parse(body)

    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
        },
      },
    })

    if (!balance) {
      return errorResponse('Leave balance record not found', 404)
    }

    const updateData: { allocated?: number; used?: number; remaining?: number } = {}
    if (data.allocated !== undefined) updateData.allocated = data.allocated
    if (data.used !== undefined) updateData.used = data.used
    if (data.remaining !== undefined) updateData.remaining = data.remaining

    const updated = await prisma.leaveBalance.update({
      where: {
        employeeId_leaveTypeId: {
          employeeId: data.employeeId,
          leaveTypeId: data.leaveTypeId,
        },
      },
      data: updateData,
      include: { leaveType: true },
    })

    return successResponse(updated, 'Leave balance updated')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating leave balance:', error)
    return errorResponse('Failed to update leave balance', 500)
  }
}
