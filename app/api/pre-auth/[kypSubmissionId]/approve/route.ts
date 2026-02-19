import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { hasPermission } from '@/lib/rbac'
import { CaseStage, PreAuthStatus } from '@prisma/client'
import { z } from 'zod'

const approveSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'TEMP_APPROVED']),
  approvedAmount: z.number().min(0, 'Approved amount must be positive'),
  approvalNotes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kypSubmissionId: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'insurance:write')) {
      return errorResponse('Forbidden: Only Insurance team can approve pre-auth', 403)
    }

    const { kypSubmissionId } = await params
    const body = await request.json()
    const data = approveSchema.parse(body)

    // Get KYP submission with lead and pre-auth data
    const kypSubmission = await prisma.kYPSubmission.findUnique({
      where: { id: kypSubmissionId },
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
            bdId: true,
            caseStage: true,
          },
        },
        preAuthData: true,
      },
    })

    if (!kypSubmission) {
      return errorResponse('KYP submission not found', 404)
    }

    if (!kypSubmission.preAuthData) {
      return errorResponse('Pre-authorization data not found', 400)
    }

    if (kypSubmission.lead.caseStage !== CaseStage.PREAUTH_RAISED) {
      return errorResponse(
        `Cannot approve pre-auth. Current stage: ${kypSubmission.lead.caseStage}. Pre-auth must be raised first.`,
        400
      )
    }

    if (kypSubmission.preAuthData.approvalStatus === PreAuthStatus.APPROVED) {
      return errorResponse('Pre-authorization has already been approved', 400)
    }

    if (kypSubmission.preAuthData.approvalStatus === PreAuthStatus.TEMP_APPROVED) {
      return errorResponse('Pre-authorization has already been temp approved', 400)
    }

    if (kypSubmission.preAuthData.approvalStatus === PreAuthStatus.REJECTED) {
      return errorResponse('Pre-authorization has already been rejected', 400)
    }

    // Update pre-auth status
    const statusMap = {
      APPROVED: PreAuthStatus.APPROVED,
      TEMP_APPROVED: PreAuthStatus.TEMP_APPROVED,
    }

    await prisma.preAuthorization.update({
      where: { kypSubmissionId },
      data: {
        approvalStatus: statusMap[data.approvalStatus],
        approvedAmount: data.approvedAmount,
        approvalNotes: data.approvalNotes?.trim() || undefined,
        handledById: user.id,
        handledAt: new Date(),
        approvedAt: new Date(),
      },
    })

    // Update KYP submission status
    await prisma.kYPSubmission.update({
      where: { id: kypSubmissionId },
      data: { status: 'PRE_AUTH_COMPLETE' },
    })

    // Update lead case stage
    await prisma.lead.update({
      where: { id: kypSubmission.lead.id },
      data: { caseStage: CaseStage.PREAUTH_COMPLETE },
    })

    // Create stage history entry
    await prisma.caseStageHistory.create({
      data: {
        leadId: kypSubmission.lead.id,
        fromStage: CaseStage.PREAUTH_RAISED,
        toStage: CaseStage.PREAUTH_COMPLETE,
        changedById: user.id,
        note: `Pre-authorization ${data.approvalStatus === 'TEMP_APPROVED' ? 'temp ' : ''}approved by Insurance`,
      },
    })

    const statusMsg = data.approvalStatus === 'TEMP_APPROVED' ? 'temp approved' : 'approved'
    await postCaseChatSystemMessage(kypSubmission.lead.id, `Insurance ${statusMsg} pre-auth.`)

    // Notify BD
    await prisma.notification.create({
      data: {
        userId: kypSubmission.lead.bdId,
        type: 'PRE_AUTH_COMPLETE',
        title: `Pre-Authorization ${data.approvalStatus === 'TEMP_APPROVED' ? 'Temp ' : ''}Approved`,
        message: `Pre-authorization has been ${statusMsg} for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef}). You can now proceed with admission.`,
        link: `/patient/${kypSubmission.lead.id}/pre-auth`,
        relatedId: kypSubmission.preAuthData.id,
      },
    })

    return successResponse(
      { message: `Pre-authorization ${statusMsg} successfully` },
      `Pre-authorization ${statusMsg} successfully`
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error approving pre-auth:', error)
    return errorResponse('Failed to approve pre-authorization', 500)
  }
}
