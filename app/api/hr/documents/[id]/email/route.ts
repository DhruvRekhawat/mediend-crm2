import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import {
  generateOfferLetterHTML,
  generateAppraisalLetterHTML,
  generateExperienceLetterHTML,
  generateRelievingLetterHTML,
} from '@/lib/hrms/document-templates'
import { sendDocumentEmail } from '@/lib/resend'
import { z } from 'zod'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: 'Offer Letter',
  APPRAISAL_LETTER: 'Appraisal Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
}

const emailSchema = z.object({
  email: z.string().email('Valid email is required'),
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

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const body = await request.json()
    const { email } = emailSchema.parse(body)

    const document = await prisma.employeeDocument.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!document) {
      return errorResponse('Document not found', 404)
    }

    if (document.documentType === 'CUSTOM') {
      return errorResponse('Custom uploaded documents cannot be emailed as HTML', 400)
    }

    const employeeData = {
      name: document.employee.user.name,
      employeeCode: document.employee.employeeCode,
      email: document.employee.user.email,
      department: document.employee.department?.name,
      joinDate: document.employee.joinDate,
      salary: document.employee.salary,
    }

    const metadata = document.metadata as Record<string, unknown> | null

    let htmlContent: string

    switch (document.documentType) {
      case 'OFFER_LETTER':
        htmlContent = generateOfferLetterHTML(employeeData, metadata || undefined)
        break
      case 'APPRAISAL_LETTER':
        htmlContent = generateAppraisalLetterHTML(employeeData, metadata || undefined)
        break
      case 'EXPERIENCE_LETTER':
        htmlContent = generateExperienceLetterHTML(employeeData, metadata || undefined)
        break
      case 'RELIEVING_LETTER':
        htmlContent = generateRelievingLetterHTML(employeeData, metadata || undefined)
        break
      default:
        return errorResponse('Invalid document type', 400)
    }

    const subjectLabel = DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType
    const subject = `Your ${subjectLabel} - Kundkund Healthcare Private Limited`

    const result = await sendDocumentEmail(email, subject, htmlContent)

    if (!result.success) {
      return errorResponse(result.error ?? 'Failed to send email', 500)
    }

    return successResponse({ sent: true }, 'Email sent successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message ?? 'Invalid request', 400)
    }
    console.error('Error sending document email:', error)
    return errorResponse('Failed to send email', 500)
  }
}
