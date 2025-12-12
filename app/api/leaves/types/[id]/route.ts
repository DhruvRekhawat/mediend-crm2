import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateLeaveTypeSchema = z.object({
  name: z.string().min(1).optional(),
  maxDays: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = updateLeaveTypeSchema.parse(body)

    // Check if name is being updated and is unique
    if (data.name) {
      const existing = await prisma.leaveTypeMaster.findFirst({
        where: {
          name: data.name,
          id: { not: params.id },
        },
      })

      if (existing) {
        return errorResponse('Leave type name already exists', 400)
      }
    }

    const updated = await prisma.leaveTypeMaster.update({
      where: { id: params.id },
      data,
    })

    return successResponse(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating leave type:', error)
    return errorResponse('Failed to update leave type', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    // Check if leave type has any leave requests or balances
    const [leaveRequestsCount, leaveBalancesCount] = await Promise.all([
      prisma.leaveRequest.count({
        where: { leaveTypeId: params.id },
      }),
      prisma.leaveBalance.count({
        where: { leaveTypeId: params.id },
      }),
    ])

    if (leaveRequestsCount > 0 || leaveBalancesCount > 0) {
      return errorResponse('Cannot delete leave type with existing leave requests or balances', 400)
    }

    await prisma.leaveTypeMaster.delete({
      where: { id: params.id },
    })

    return successResponse(null, 'Leave type deleted successfully')
  } catch (error) {
    console.error('Error deleting leave type:', error)
    return errorResponse('Failed to delete leave type', 500)
  }
}

