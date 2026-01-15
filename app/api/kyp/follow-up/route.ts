import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const followUpSchema = z.object({
  kypSubmissionId: z.string(),
  admissionDate: z.string().optional().nullable(),
  surgeryDate: z.string().optional().nullable(),
  prescription: z.string().optional(),
  report: z.string().optional(),
  hospitalName: z.string().optional(),
  doctorName: z.string().optional(),
  prescriptionFileUrl: z.string().optional(),
  reportFileUrl: z.string().optional(),
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
    const data = followUpSchema.parse(body)

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

    // Check if user is the BD assigned to this lead or has admin permissions
    if (kypSubmission.lead.bdId !== user.id && user.role !== 'ADMIN' && user.role !== 'SALES_HEAD') {
      return errorResponse('You do not have permission to update follow-up for this lead', 403)
    }

    // Check if pre-auth is complete
    if (kypSubmission.status !== 'PRE_AUTH_COMPLETE') {
      return errorResponse('Pre-authorization must be completed before adding follow-up', 400)
    }

    // Create or update follow-up
    const followUp = await prisma.patientFollowUp.upsert({
      where: { kypSubmissionId: data.kypSubmissionId },
      create: {
        kypSubmissionId: data.kypSubmissionId,
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        surgeryDate: data.surgeryDate ? new Date(data.surgeryDate) : null,
        prescription: data.prescription,
        report: data.report,
        hospitalName: data.hospitalName,
        doctorName: data.doctorName,
        prescriptionFileUrl: data.prescriptionFileUrl,
        reportFileUrl: data.reportFileUrl,
        updatedById: user.id,
      },
      update: {
        admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
        surgeryDate: data.surgeryDate ? new Date(data.surgeryDate) : null,
        prescription: data.prescription,
        report: data.report,
        hospitalName: data.hospitalName,
        doctorName: data.doctorName,
        prescriptionFileUrl: data.prescriptionFileUrl,
        reportFileUrl: data.reportFileUrl,
        updatedById: user.id,
        updatedAt: new Date(),
      },
    })

    // Update KYP status
    await prisma.kYPSubmission.update({
      where: { id: data.kypSubmissionId },
      data: {
        status: 'FOLLOW_UP_COMPLETE',
      },
    })

    // Create notifications for BD and Insurance teams
    const insuranceUsers = await prisma.user.findMany({
      where: {
        role: 'INSURANCE_HEAD',
      },
    })

    const notifications = [
      {
        userId: kypSubmission.submittedById,
        type: 'FOLLOW_UP_COMPLETE' as const,
        title: 'Follow-Up Complete',
        message: `Follow-up details added for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef})`,
        link: `/bd/kyp?kyp=${kypSubmission.id}`,
        relatedId: kypSubmission.id,
      },
      ...insuranceUsers.map((insuranceUser) => ({
        userId: insuranceUser.id,
        type: 'FOLLOW_UP_COMPLETE' as const,
        title: 'Follow-Up Complete',
        message: `Follow-up details added for ${kypSubmission.lead.patientName} (${kypSubmission.lead.leadRef})`,
        link: `/insurance/dashboard?kyp=${kypSubmission.id}`,
        relatedId: kypSubmission.id,
      })),
    ]

    await prisma.notification.createMany({
      data: notifications,
    })

    return successResponse(followUp, 'Follow-up submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error submitting follow-up:', error)
    return errorResponse('Failed to submit follow-up', 500)
  }
}
