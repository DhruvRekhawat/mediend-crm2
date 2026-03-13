import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { calculateLeaveDays, checkDateConflict } from '@/lib/hrms/leave-utils'
import { getComputedBalancesForEmployee, validateComputedBalance } from '@/lib/hrms/leave-policy-calculator'
import { findLeaveApprover } from '@/lib/hierarchy'
import { z } from 'zod'

const applyLeaveSchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
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

    // Check 6-month probation period (leaves locked during probation)
    if (employee.joinDate) {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      if (employee.joinDate > sixMonthsAgo) {
        const probationEndDate = new Date(employee.joinDate)
        probationEndDate.setMonth(probationEndDate.getMonth() + 6)
        return errorResponse(
          `You are in probation period. Leave applications will be available after ${probationEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          400
        )
      }
    }

    const body = await request.json()
    const { leaveTypeId, startDate, endDate, reason } = applyLeaveSchema.parse(body)

    // Validate dates
    if (startDate > endDate) {
      return errorResponse('Start date must be before end date', 400)
    }

    if (startDate < new Date()) {
      return errorResponse('Cannot apply for leave in the past', 400)
    }

    // Check leave type exists
    const leaveType = await prisma.leaveTypeMaster.findUnique({
      where: { id: leaveTypeId },
    })

    if (!leaveType || !leaveType.isActive) {
      return errorResponse('Invalid leave type', 400)
    }

    // Calculate days
    const days = calculateLeaveDays(startDate, endDate)

    // Validate against policy-computed balance
    const balances = await getComputedBalancesForEmployee(employee.id)
    const balanceValidation = validateComputedBalance(balances, leaveTypeId, days)
    const isUnpaid = !balanceValidation.valid

    if (!balanceValidation.valid && !balanceValidation.error?.includes('Insufficient')) {
      return errorResponse(balanceValidation.error ?? 'Cannot apply for leave', 400)
    }

    // Check for date conflicts
    const existingLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    })

    const conflictCheck = checkDateConflict(existingLeaves, startDate, endDate)
    if (conflictCheck.hasConflict) {
      return errorResponse('Leave request conflicts with existing approved/pending leave', 400)
    }

    // Compute target approver from hierarchy (immediate manager or next available if on leave)
    const targetApprover = await findLeaveApprover(employee.id, {
      leaveStartDate: startDate,
      leaveEndDate: endDate,
    })

    // Create leave request (allow unpaid when balance insufficient)
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        startDate,
        endDate,
        days,
        reason,
        isUnpaid,
        targetApproverId: targetApprover?.id ?? null,
      },
      include: {
        leaveType: true,
        targetApprover: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    return successResponse(leaveRequest, 'Leave request submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error applying for leave:', error)
    return errorResponse('Failed to apply for leave', 500)
  }
}

