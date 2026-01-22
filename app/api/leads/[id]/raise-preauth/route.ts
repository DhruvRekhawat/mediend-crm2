import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { CaseStage } from '@prisma/client'

const raisePreAuthSchema = z.object({
  requestedHospitalName: z.string().min(1, 'Hospital selection is required'),
  requestedRoomType: z.string().min(1, 'Room type selection is required'),
  diseaseDescription: z.string().min(1, 'Disease description is required'),
  diseaseImages: z.array(z.object({
    name: z.string(),
    url: z.string(),
  })).optional(),
  expectedAdmissionDate: z.string().optional(),
  expectedSurgeryDate: z.string().optional(),
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

    if (lead.caseStage !== CaseStage.KYP_COMPLETE) {
      return errorResponse(`Cannot raise pre-auth. Current stage: ${lead.caseStage}. Insurance must add KYP details first.`, 400)
    }

    // Pre-auth must exist (created by Insurance with hospitals + room types)
    const existingPreAuth = await prisma.preAuthorization.findUnique({
      where: { kypSubmissionId: lead.kypSubmission.id },
    })

    if (!existingPreAuth) {
      return errorResponse('Insurance must add KYP details (hospitals, room types) before BD can raise pre-auth.', 400)
    }

    if (existingPreAuth.preAuthRaisedAt) {
      return errorResponse('Pre-auth already raised for this case', 400)
    }

    const hospitals = (existingPreAuth.hospitalSuggestions as string[] | null) ?? []
    const roomTypes = (existingPreAuth.roomTypes as Array<{ name: string; rent: string }> | null) ?? []
    if (hospitals.length && !hospitals.includes(data.requestedHospitalName)) {
      return errorResponse('Selected hospital must be one of Insurance\'s suggested hospitals.', 400)
    }
    const roomNames = roomTypes.map((r) => r.name)
    if (roomNames.length && !roomNames.includes(data.requestedRoomType)) {
      return errorResponse('Selected room type must be one of Insurance\'s suggested room types.', 400)
    }

    const preAuth = await prisma.preAuthorization.update({
      where: { kypSubmissionId: lead.kypSubmission.id },
      data: {
        requestedHospitalName: data.requestedHospitalName,
        requestedRoomType: data.requestedRoomType,
        diseaseDescription: data.diseaseDescription,
        diseaseImages: data.diseaseImages ?? [],
        preAuthRaisedAt: new Date(),
        preAuthRaisedById: user.id,
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
