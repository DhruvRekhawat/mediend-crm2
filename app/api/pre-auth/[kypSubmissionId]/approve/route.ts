import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { hasPermission } from '@/lib/rbac'
import { CaseStage, PreAuthStatus } from '@prisma/client'

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

    if (kypSubmission.preAuthData.approvalStatus === PreAuthStatus.REJECTED) {
      return errorResponse('Pre-authorization has already been rejected', 400)
    }

    // Update pre-auth status
    await prisma.preAuthorization.update({
      where: { kypSubmissionId },
      data: {
        approvalStatus: PreAuthStatus.APPROVED,
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
        note: 'Pre-authorization approved by Insurance',
      },
    })

    await postCaseChatSystemMessage(kypSubmission.lead.id, 'Insurance approved pre-auth.')

    // Notify BD
    await prisma.notification.create({
      data: {
        userId: kypSubmission.lead.bdId,
        type: 'PRE_AUTH_COMPLETE',
        title: 'Pre-Authorization Approved',
        message: `Pre-authorization has been approved for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef}). You can now proceed with admission.`,
        link: `/patient/${kypSubmission.lead.id}/pre-auth`,
        relatedId: kypSubmission.preAuthData.id,
      },
    })

    return successResponse(
      { message: 'Pre-authorization approved successfully' },
      'Pre-authorization approved successfully'
    )
  } catch (error) {
    console.error('Error approving pre-auth:', error)
    return errorResponse('Failed to approve pre-authorization', 500)
  }
}
