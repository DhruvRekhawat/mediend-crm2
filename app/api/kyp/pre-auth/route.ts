import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { CaseStage } from '@prisma/client'

const roomTypeSchema = z.object({
  name: z.string().min(1),
  rent: z.string(),
})

const preAuthSchema = z.object({
  kypSubmissionId: z.string(),
  sumInsured: z.string().optional(),
  roomRent: z.string().optional(),
  capping: z.string().optional(),
  copay: z.string().optional(),
  icu: z.string().optional(),
  hospitalNameSuggestion: z.string().optional(),
  hospitalSuggestions: z.array(z.string()).optional(),
  roomTypes: z.array(roomTypeSchema).optional(),
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

    const kypSubmission = await prisma.kYPSubmission.findUnique({
      where: { id: data.kypSubmissionId },
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

    const { caseStage } = kypSubmission.lead

    // Flow 1: Insurance adds KYP details first (KYP_PENDING) → KYP_COMPLETE
    if (caseStage === CaseStage.KYP_PENDING) {
      const payload = {
        kypSubmissionId: data.kypSubmissionId,
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        hospitalSuggestions: data.hospitalSuggestions ?? [],
        roomTypes: data.roomTypes ?? [],
        insurance: data.insurance,
        tpa: data.tpa,
        handledById: user.id,
        handledAt: new Date(),
      }

      const preAuth = await prisma.preAuthorization.upsert({
        where: { kypSubmissionId: data.kypSubmissionId },
        create: payload,
        update: payload,
      })

      await prisma.kYPSubmission.update({
        where: { id: data.kypSubmissionId },
        data: { status: 'KYP_DETAILS_ADDED' },
      })

      await prisma.lead.update({
        where: { id: kypSubmission.lead.id },
        data: { caseStage: CaseStage.KYP_COMPLETE },
      })

      await prisma.caseStageHistory.create({
        data: {
          leadId: kypSubmission.lead.id,
          fromStage: CaseStage.KYP_PENDING,
          toStage: CaseStage.KYP_COMPLETE,
          changedById: user.id,
          note: 'KYP details added by Insurance (hospitals, room types, TPA, etc.)',
        },
      })

      await prisma.notification.create({
        data: {
          userId: kypSubmission.submittedById,
          type: 'KYP_SUBMITTED',
          title: 'KYP Complete – Ready for Pre-Auth',
          message: `Insurance has added KYP details for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef}). You can now raise pre-auth with hospital and room selection.`,
          link: `/patient/${kypSubmission.lead.id}/pre-auth`,
          relatedId: kypSubmission.id,
        },
      })

      return successResponse(preAuth, 'KYP details saved. BD can now raise pre-auth with hospital and room selection.')
    }

    // Flow 2: Insurance completes pre-auth after BD raised (PREAUTH_RAISED) → PREAUTH_COMPLETE
    if (caseStage === CaseStage.PREAUTH_RAISED) {
      if (!kypSubmission.preAuthData) {
        return errorResponse('Pre-auth record not found. BD must raise pre-auth first.', 400)
      }

      const updatePayload = {
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        hospitalSuggestions: data.hospitalSuggestions ?? undefined,
        roomTypes: data.roomTypes ?? undefined,
        insurance: data.insurance,
        tpa: data.tpa,
        handledById: user.id,
        handledAt: new Date(),
      }

      const preAuth = await prisma.preAuthorization.update({
        where: { kypSubmissionId: data.kypSubmissionId },
        data: updatePayload,
      })

      await prisma.kYPSubmission.update({
        where: { id: data.kypSubmissionId },
        data: { status: 'PRE_AUTH_COMPLETE' },
      })

      await prisma.lead.update({
        where: { id: kypSubmission.lead.id },
        data: { caseStage: CaseStage.PREAUTH_COMPLETE },
      })

      await prisma.caseStageHistory.create({
        data: {
          leadId: kypSubmission.lead.id,
          fromStage: CaseStage.PREAUTH_RAISED,
          toStage: CaseStage.PREAUTH_COMPLETE,
          changedById: user.id,
          note: 'Pre-authorization completed by Insurance',
        },
      })

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

      return successResponse(preAuth, 'Pre-authorization completed successfully')
    }

    if (caseStage === CaseStage.KYP_COMPLETE && !kypSubmission.preAuthData?.preAuthRaisedAt) {
      // Insurance editing KYP details before BD has raised
      const payload = {
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        hospitalSuggestions: (data.hospitalSuggestions ?? []) as object,
        roomTypes: (data.roomTypes ?? []) as object,
        insurance: data.insurance,
        tpa: data.tpa,
        handledById: user.id,
        handledAt: new Date(),
      }

      const preAuth = await prisma.preAuthorization.upsert({
        where: { kypSubmissionId: data.kypSubmissionId },
        create: {
          kypSubmissionId: data.kypSubmissionId,
          ...payload,
        },
        update: payload,
      })

      return successResponse(preAuth, 'KYP details updated')
    }

    return errorResponse(
      `Cannot update pre-auth. Current stage: ${caseStage}. ` +
        'Insurance can add details when KYP is pending, or complete pre-auth after BD has raised.',
      400
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error submitting pre-auth:', error)
    return errorResponse('Failed to submit pre-authorization', 500)
  }
}
