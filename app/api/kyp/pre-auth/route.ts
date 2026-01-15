import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const preAuthSchema = z.object({
  kypSubmissionId: z.string(),
  sumInsured: z.string().optional(),
  roomRent: z.string().optional(),
  capping: z.string().optional(),
  copay: z.string().optional(),
  icu: z.string().optional(),
  hospitalNameSuggestion: z.string().optional(),
  insurance: z.string().optional(),
  tpa: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'INSURANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = preAuthSchema.parse(body)

    // Check if KYP submission exists
    const kypSubmission = await prisma.kYPSubmission.findUnique({
      where: { id: data.kypSubmissionId },
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
            bdId: true,
          },
        },
      },
    })

    if (!kypSubmission) {
      return errorResponse('KYP submission not found', 404)
    }

    // Create or update pre-authorization
    const preAuth = await prisma.preAuthorization.upsert({
      where: { kypSubmissionId: data.kypSubmissionId },
      create: {
        kypSubmissionId: data.kypSubmissionId,
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        insurance: data.insurance,
        tpa: data.tpa,
        handledById: user.id,
      },
      update: {
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        insurance: data.insurance,
        tpa: data.tpa,
        handledById: user.id,
        handledAt: new Date(),
      },
    })

    // Update KYP status
    await prisma.kYPSubmission.update({
      where: { id: data.kypSubmissionId },
      data: {
        status: 'PRE_AUTH_COMPLETE',
      },
    })

    // Create notification for the BD who submitted
    await prisma.notification.create({
      data: {
        userId: kypSubmission.submittedById,
        type: 'PRE_AUTH_COMPLETE',
        title: 'Pre-Authorization Complete',
        message: `Pre-authorization completed for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef})`,
        link: `/bd/kyp?kyp=${kypSubmission.id}`,
        relatedId: kypSubmission.id,
      },
    })

    return successResponse(preAuth, 'Pre-authorization submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error submitting pre-auth:', error)
    return errorResponse('Failed to submit pre-authorization', 500)
  }
}
