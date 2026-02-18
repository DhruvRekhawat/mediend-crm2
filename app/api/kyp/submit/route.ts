import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { postCaseChatSystemMessage } from '@/lib/case-chat'
import { z } from 'zod'
import { UserRole, CaseStage } from '@prisma/client'

const submitKYPSchema = z.object({
  leadId: z.string(),
  type: z.enum(['basic', 'detailed']).optional(), // default: legacy single-step
  patientName: z.string().optional(),
  phone: z.string().optional(),
  aadhar: z.string().optional(),
  pan: z.string().optional(),
  insuranceCard: z.string().optional(),
  insuranceName: z.string().optional(),
  doctorName: z.string().optional(),
  disease: z.string().optional(),
  location: z.string().optional(),
  area: z.string().optional(),
  remark: z.string().optional(),
  aadharFileUrl: z.string().optional(),
  panFileUrl: z.string().optional(),
  insuranceCardFileUrl: z.string().optional(),
  insuranceCardFiles: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  prescriptionFileUrl: z.string().optional(),
  diseasePhotos: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  patientConsent: z.boolean().optional(),
  otherFiles: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const data = submitKYPSchema.parse(body)

    const isBasic = data.type === 'basic'
    const isDetailed = data.type === 'detailed'

    if (isBasic) {
      if (!data.insuranceCardFileUrl?.trim() && (!data.insuranceCardFiles || data.insuranceCardFiles.length === 0)) {
        return errorResponse('Insurance card upload is required for KYP Basic', 400)
      }
      if (!data.location?.trim()) {
        return errorResponse('City is required for KYP Basic', 400)
      }
      if (!data.area?.trim()) {
        return errorResponse('Area is required for KYP Basic', 400)
      }
    } else if (isDetailed) {
      if (!data.disease?.trim()) {
        return errorResponse('Disease/Diagnosis is required for KYP Detailed', 400)
      }
    } else {
      // Legacy: at least one field
      const hasData =
        data.aadhar ||
        data.pan ||
        data.insuranceCard ||
        data.disease ||
        data.location ||
        data.remark ||
        data.aadharFileUrl ||
        data.panFileUrl ||
        data.insuranceCardFileUrl ||
        (data.otherFiles && data.otherFiles.length > 0)
      if (!hasData) {
        return errorResponse('At least one field must be filled', 400)
      }
    }

    // Check if lead exists and user has access
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      include: { bd: true },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    // Check if user is the BD assigned to this lead or has admin permissions
    if (lead.bdId !== user.id && user.role !== 'ADMIN' && user.role !== 'SALES_HEAD') {
      return errorResponse('You do not have permission to submit KYP for this lead', 403)
    }

    const existingKYP = await prisma.kYPSubmission.findUnique({
      where: { leadId: data.leadId },
      include: { lead: { select: { caseStage: true } } },
    })

    // Detailed: update existing KYP and move to KYP_DETAILED_COMPLETE (BD can then raise pre-auth)
    if (isDetailed) {
      if (!existingKYP) {
        return errorResponse('KYP submission not found. Submit KYP (Basic) first.', 400)
      }
      if (existingKYP.lead.caseStage !== CaseStage.KYP_BASIC_COMPLETE) {
        return errorResponse('Case must be in KYP Basic Complete stage. Insurance must suggest hospitals first.', 400)
      }

      const kypSubmission = await prisma.kYPSubmission.update({
        where: { leadId: data.leadId },
        data: {
          disease: data.disease ?? undefined,
          patientConsent: data.patientConsent ?? false,
          aadhar: data.aadhar,
          pan: data.pan,
          aadharFileUrl: data.aadharFileUrl,
          panFileUrl: data.panFileUrl,
          prescriptionFileUrl: data.prescriptionFileUrl,
          diseasePhotos: data.diseasePhotos ?? undefined,
          otherFiles: data.otherFiles ?? undefined,
        },
        include: {
          lead: { select: { id: true, leadRef: true, patientName: true, caseStage: true } },
          submittedBy: { select: { id: true, name: true } },
        },
      })

      const previousStage = lead.caseStage
      await prisma.lead.update({
        where: { id: data.leadId },
        data: { caseStage: CaseStage.KYP_DETAILED_COMPLETE },
      })

      await prisma.caseStageHistory.create({
        data: {
          leadId: data.leadId,
          fromStage: previousStage,
          toStage: CaseStage.KYP_DETAILED_COMPLETE,
          changedById: user.id,
          note: 'KYP (Detailed) submitted',
        },
      })

      await postCaseChatSystemMessage(data.leadId, 'BD submitted KYP (Detailed). You can now raise pre-auth.')

      return successResponse(kypSubmission, 'KYP (Detailed) submitted. You can now raise pre-auth.')
    }

    if (existingKYP) {
      return errorResponse('KYP submission already exists for this lead', 400)
    }

    // Create KYP submission (basic or legacy)
    const kypSubmission = await prisma.kYPSubmission.create({
      data: {
        leadId: data.leadId,
        aadhar: data.aadhar,
        pan: data.pan,
        insuranceCard: data.insuranceCard,
        disease: data.disease,
        location: data.location ?? undefined,
        area: data.area ?? undefined,
        remark: data.remark,
        aadharFileUrl: data.aadharFileUrl,
        panFileUrl: data.panFileUrl,
        insuranceCardFileUrl: data.insuranceCardFileUrl ?? (data.insuranceCardFiles?.[0]?.url || undefined),
        prescriptionFileUrl: data.prescriptionFileUrl,
        diseasePhotos: data.diseasePhotos ?? undefined,
        patientConsent: data.patientConsent ?? false,
        otherFiles: data.otherFiles || data.insuranceCardFiles || [],
        submittedById: user.id,
        status: 'PENDING',
      },
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
            caseStage: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const targetStage = isBasic ? CaseStage.KYP_BASIC_COMPLETE : CaseStage.KYP_PENDING
    const previousStage = lead.caseStage
    await prisma.lead.update({
      where: { id: data.leadId },
      data: {
        caseStage: targetStage,
        ...(data.patientName?.trim() ? { patientName: data.patientName.trim() } : {}),
        ...(data.phone?.trim() ? { phoneNumber: data.phone.trim() } : {}),
        ...(isBasic && data.location?.trim() ? { city: data.location.trim() } : {}),
        ...(data.insuranceName?.trim() ? { insuranceName: data.insuranceName.trim() } : {}),
        ...(data.doctorName?.trim() ? { ipdDrName: data.doctorName.trim() } : {}),
      },
    })

    await prisma.caseStageHistory.create({
      data: {
        leadId: data.leadId,
        fromStage: previousStage,
        toStage: targetStage,
        changedById: user.id,
        note: isBasic ? 'KYP (Basic) submitted' : 'KYP submitted',
      },
    })

    await postCaseChatSystemMessage(data.leadId, isBasic ? 'BD submitted KYP (Basic).' : 'BD submitted KYP.')

    const insuranceUsers = await prisma.user.findMany({
      where: {
        role: 'INSURANCE_HEAD',
      },
    })

    await prisma.notification.createMany({
      data: insuranceUsers.map((insuranceUser) => ({
        userId: insuranceUser.id,
        type: 'KYP_SUBMITTED',
        title: 'New KYP Submission',
        message: `New KYP submission for ${lead.patientName} (${lead.leadRef})`,
        link: `/insurance/dashboard?kyp=${kypSubmission.id}`,
        relatedId: kypSubmission.id,
      })),
    })

    return successResponse(kypSubmission, 'KYP submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error submitting KYP:', error)
    return errorResponse('Failed to submit KYP', 500)
  }
}
