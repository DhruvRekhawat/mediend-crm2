import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const approveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  remarks: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:leaves:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id: leaveId } = await params

    const body = await request.json()
    const { status, remarks } = approveSchema.parse(body)

    // Get leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        leaveType: true,
      },
    })

    if (!leaveRequest) {
      return errorResponse('Leave request not found', 404)
    }

    if (leaveRequest.status !== 'PENDING') {
      return errorResponse('Leave request is not pending', 400)
    }

    // Update leave request
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        approvedById: user.id,
        approvedAt: new Date(),
        remarks: remarks || null,
      },
    })

    // Update leave balance if approved
    if (status === 'APPROVED') {
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveRequest.employeeId,
            leaveTypeId: leaveRequest.leaveTypeId,
          },
        },
      })

      if (balance) {
        const newUsed = balance.used + leaveRequest.days
        const newRemaining = balance.remaining - leaveRequest.days

        if (newRemaining < 0) {
          console.warn(`Warning: Leave balance would go negative for employee ${leaveRequest.employeeId}`)
        }

        await prisma.leaveBalance.update({
          where: {
            employeeId_leaveTypeId: {
              employeeId: leaveRequest.employeeId,
              leaveTypeId: leaveRequest.leaveTypeId,
            },
          },
          data: {
            used: newUsed,
            remaining: Math.max(0, newRemaining), // Prevent negative balance
          },
        })
      } else {
        console.warn(`Warning: Leave balance not found for employee ${leaveRequest.employeeId}, leave type ${leaveRequest.leaveTypeId}`)
      }
    }

    return successResponse(updated, `Leave request ${status.toLowerCase()}`)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return errorResponse(`Invalid request data: ${error.errors.map(e => e.message).join(', ')}`, 400)
    }
    console.error('Error approving leave:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return errorResponse(`Failed to approve leave: ${error instanceof Error ? error.message : 'Unknown error'}`, 500)
  }
}

