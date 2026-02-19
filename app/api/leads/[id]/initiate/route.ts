import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { z } from 'zod'
import { CaseStage } from '@prisma/client'

const initiateSchema = z.object({
  admissionDate: z.string().min(1, 'Admission date is required'),
  admissionTime: z.string().min(1, 'Admission time is required'),
  admittingHospital: z.string().min(1, 'Hospital name is required'),
  hospitalAddress: z.string().min(1, 'Hospital address is required'),
  googleMapLocation: z.string().optional(),
  surgeryDate: z.string().min(1, 'Surgery date is required'),
  surgeryTime: z.string().min(1, 'Surgery time is required'),
  tpa: z.string().min(1, 'TPA is required'),
  instrument: z.string().optional(),
  implantConsumables: z.string().optional(),
  notes: z.string().optional(),
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
      return errorResponse('Forbidden: Only BD can initiate admission', 403)
    }

    const { id: leadId } = await params
    const body = await request.json()
    const data = initiateSchema.parse(body)

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        kypSubmission: {
          include: {
            preAuthData: true,
          },
        },
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (lead.caseStage !== CaseStage.PREAUTH_COMPLETE) {
      return errorResponse(`Cannot initiate admission. Current stage: ${lead.caseStage}. Pre-auth must be complete first.`, 400)
    }

    // Check if admission already exists
    const existingAdmission = await prisma.admissionRecord.findUnique({
      where: { leadId },
    })

    if (existingAdmission) {
      return errorResponse('Admission already initiated for this case', 400)
    }

    // Create admission record
    const admission = await prisma.admissionRecord.create({
      data: {
        leadId,
        admissionDate: new Date(data.admissionDate),
        admissionTime: data.admissionTime,
        admittingHospital: data.admittingHospital,
        hospitalAddress: data.hospitalAddress,
        googleMapLocation: data.googleMapLocation?.trim() || undefined,
        surgeryDate: new Date(data.surgeryDate),
        surgeryTime: data.surgeryTime,
        tpa: data.tpa,
        instrument: data.instrument?.trim() || undefined,
        implantConsumables: data.implantConsumables?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        initiatedById: user.id,
      },
    })

    // Update lead case stage
    const previousStage = lead.caseStage
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        caseStage: CaseStage.INITIATED,
        hospitalName: data.admittingHospital,
        ipdAdmissionDate: new Date(data.admissionDate),
      },
    })

    // Create stage history entry
    await prisma.caseStageHistory.create({
      data: {
        leadId,
        fromStage: previousStage,
        toStage: CaseStage.INITIATED,
        changedById: user.id,
        note: `Patient admitted at ${data.admittingHospital}`,
      },
    })

    await postCaseChatSystemMessage(leadId, `BD marked patient admitted at ${data.admittingHospital}.`)

    // Create notifications for Insurance team
    const insuranceUsers = await prisma.user.findMany({
      where: {
        role: 'INSURANCE_HEAD',
      },
    })

    await prisma.notification.createMany({
      data: insuranceUsers.map((insuranceUser) => ({
        userId: insuranceUser.id,
        type: 'INITIATED',
        title: 'Patient Admitted',
        message: `Patient ${lead.patientName} (${lead.leadRef}) has been admitted at ${data.admittingHospital}`,
        link: `/patient/${leadId}`,
        relatedId: admission.id,
      })),
    })

    return successResponse(admission, 'Admission initiated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data: ' + error.errors.map(e => e.message).join(', '), 400)
    }
    console.error('Error initiating admission:', error)
    return errorResponse('Failed to initiate admission', 500)
  }
}
