import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { uploadFileToS3 } from '@/lib/s3-client'
import { z } from 'zod'
import { UserRole, CaseStage } from '@prisma/client'

const submitKYPSchema = z.object({
  leadId: z.string(),
  aadhar: z.string().optional(),
  pan: z.string().optional(),
  insuranceCard: z.string().optional(),
  disease: z.string().optional(),
  location: z.string().optional(),
  remark: z.string().optional(),
  aadharFileUrl: z.string().optional(),
  panFileUrl: z.string().optional(),
  insuranceCardFileUrl: z.string().optional(),
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

    // Validate that at least one field is filled
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

    // Check if KYP already exists
    const existingKYP = await prisma.kYPSubmission.findUnique({
      where: { leadId: data.leadId },
    })

    if (existingKYP) {
      return errorResponse('KYP submission already exists for this lead', 400)
    }

    // Create KYP submission
    const kypSubmission = await prisma.kYPSubmission.create({
      data: {
        leadId: data.leadId,
        aadhar: data.aadhar,
        pan: data.pan,
        insuranceCard: data.insuranceCard,
        disease: data.disease,
        location: data.location,
        remark: data.remark,
        aadharFileUrl: data.aadharFileUrl,
        panFileUrl: data.panFileUrl,
        insuranceCardFileUrl: data.insuranceCardFileUrl,
        otherFiles: data.otherFiles || [],
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

    // Update lead case stage
    const previousStage = lead.caseStage
    await prisma.lead.update({
      where: { id: data.leadId },
      data: {
        caseStage: CaseStage.KYP_PENDING,
      },
    })

    // Create stage history entry
    await prisma.caseStageHistory.create({
      data: {
        leadId: data.leadId,
        fromStage: previousStage,
        toStage: CaseStage.KYP_PENDING,
        changedById: user.id,
        note: 'KYP submitted',
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
