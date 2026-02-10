import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { hasPermission } from '@/lib/rbac'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ kypSubmissionId: string }> }
) {
  try {
    const user = getSessionFromRequest(_request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'insurance:write')) {
      return errorResponse('Forbidden: Only Insurance team can mark new hospital pre-auth raised', 403)
    }

    const { kypSubmissionId } = await params

    const kypSubmission = await prisma.kYPSubmission.findUnique({
      where: { id: kypSubmissionId },
      include: {
        lead: { select: { id: true } },
        preAuthData: true,
      },
    })

    if (!kypSubmission?.preAuthData) {
      return errorResponse('Pre-authorization not found', 404)
    }

    if (!kypSubmission.preAuthData.isNewHospitalRequest) {
      return errorResponse('This pre-auth is not a new hospital request', 400)
    }

    if (kypSubmission.preAuthData.newHospitalPreAuthRaised) {
      return successResponse(
        { newHospitalPreAuthRaised: true },
        'New hospital pre-auth already marked as raised'
      )
    }

    await prisma.preAuthorization.update({
      where: { kypSubmissionId },
      data: { newHospitalPreAuthRaised: true },
    })

    await postCaseChatSystemMessage(
      kypSubmission.lead.id,
      'Insurance marked pre-auth raised for the new hospital. Proceeding to approve/reject.'
    )

    return successResponse(
      { newHospitalPreAuthRaised: true },
      'Marked pre-auth raised for new hospital'
    )
  } catch (error) {
    console.error('Error marking new hospital pre-auth raised:', error)
    return errorResponse('Failed to update', 500)
  }
}
