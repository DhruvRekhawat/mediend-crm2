import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { z } from 'zod'
import { CaseStage } from '@prisma/client'

const raisePreAuthSchema = z.object({
  requestedHospitalName: z.string().min(1, 'Hospital name is required'),
  requestedRoomType: z.string().optional(), // required only when not new hospital in UI
  diseaseDescription: z.string().min(1, 'Disease description is required'),
  diseaseImages: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
  expectedAdmissionDate: z.string().optional(),
  expectedSurgeryDate: z.string().optional(),
  isNewHospitalRequest: z.boolean().optional().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'BD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only BD can raise pre-auth requests', 403)
    }

    const { id: leadId } = await params
    const body = await request.json()
    const data = raisePreAuthSchema.parse(body)

    // Check if lead exists and get KYP submission
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        kypSubmission: true,
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (!lead.kypSubmission) {
      return errorResponse('KYP submission not found. Please submit KYP first.', 400)
    }

    const allowedStages: CaseStage[] = [
      CaseStage.KYP_DETAILED_PENDING,
      CaseStage.KYP_DETAILED_COMPLETE,
      CaseStage.KYP_COMPLETE,
    ]
    if (!allowedStages.includes(lead.caseStage)) {
      return errorResponse(`Cannot raise pre-auth. Current stage: ${lead.caseStage}. Submit KYP (Detailed) first or wait for Insurance to add details.`, 400)
    }

    const existingPreAuth = await prisma.preAuthorization.findFirst({
      where: { kypSubmissionId: lead.kypSubmission.id },
      include: { suggestedHospitals: true },
    })

    if (!existingPreAuth) {
      return errorResponse('Insurance must suggest hospitals before BD can raise pre-auth.', 400)
    }

    if (existingPreAuth.preAuthRaisedAt) {
      return errorResponse('Pre-auth already raised for this case', 400)
    }

    const isNewHospital = data.isNewHospitalRequest === true
    if (!isNewHospital) {
      const suggestedNames = existingPreAuth.suggestedHospitals.map((h) => h.hospitalName)
      const legacyHospitals = (existingPreAuth.hospitalSuggestions as string[] | null) ?? []
      const allHospitals = suggestedNames.length > 0 ? suggestedNames : legacyHospitals
      if (allHospitals.length > 0 && !allHospitals.includes(data.requestedHospitalName)) {
        return errorResponse('Selected hospital must be one of Insurance\'s suggested hospitals, or use Request New Hospital.', 400)
      }
      if (!data.requestedRoomType?.trim()) {
        return errorResponse('Room type is required when selecting a suggested hospital.', 400)
      }
    }

    const preAuth = await prisma.preAuthorization.update({
      where: { kypSubmissionId: lead.kypSubmission.id },
      data: {
        requestedHospitalName: data.requestedHospitalName,
        requestedRoomType: data.requestedRoomType ?? null,
        diseaseDescription: data.diseaseDescription,
        diseaseImages: data.diseaseImages ?? [],
        preAuthRaisedAt: new Date(),
        preAuthRaisedById: user.id,
        isNewHospitalRequest: isNewHospital,
      },
    })

    // Update lead case stage
    const previousStage = lead.caseStage
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        caseStage: CaseStage.PREAUTH_RAISED,
      },
    })

    // Create stage history entry
    await prisma.caseStageHistory.create({
      data: {
        leadId,
        fromStage: previousStage,
        toStage: CaseStage.PREAUTH_RAISED,
        changedById: user.id,
        note: `Pre-auth raised by BD. Hospital: ${data.requestedHospitalName}`,
      },
    })

    await postCaseChatSystemMessage(leadId, `BD raised pre-auth for ${data.requestedHospitalName}.`)

    // Create notifications for Insurance team
    const insuranceUsers = await prisma.user.findMany({
      where: {
        role: 'INSURANCE_HEAD',
      },
    })

    await prisma.notification.createMany({
      data: insuranceUsers.map((insuranceUser) => ({
        userId: insuranceUser.id,
        type: 'PREAUTH_RAISED',
        title: 'Pre-Auth Raised',
        message: `BD has raised pre-auth request for ${lead.patientName} (${lead.leadRef})`,
        link: `/patient/${leadId}/pre-auth`,
        relatedId: preAuth.id,
      })),
    })

    return successResponse(preAuth, 'Pre-auth raised successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data: ' + error.errors.map(e => e.message).join(', '), 400)
    }
    console.error('Error raising pre-auth:', error)
    return errorResponse('Failed to raise pre-auth', 500)
  }
}
