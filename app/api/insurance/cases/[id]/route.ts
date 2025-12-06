import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'insurance:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()

    const updateData: any = {
      handledById: user.id,
      updatedAt: new Date(),
    }

    if (body.caseStatus) updateData.caseStatus = body.caseStatus
    if (body.approvalAmount !== undefined) updateData.approvalAmount = body.approvalAmount
    if (body.tpaRemarks !== undefined) updateData.tpaRemarks = body.tpaRemarks
    if (body.caseStatus === 'APPROVED' && !body.approvedAt) {
      updateData.approvedAt = new Date()
    }

    const updatedCase = await prisma.insuranceCase.update({
      where: { id },
      data: updateData,
      include: {
        lead: true,
      },
    })

    // If approved, move lead to PL stage
    if (body.caseStatus === 'APPROVED') {
      await prisma.lead.update({
        where: { id: updatedCase.leadId },
        data: {
          pipelineStage: 'PL',
          updatedById: user.id,
        },
      })
    }

    return successResponse(updatedCase, 'Insurance case updated successfully')
  } catch (error: any) {
    console.error('Error updating insurance case:', error)
    return errorResponse('Failed to update insurance case', 500)
  }
}

