import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { format } from 'date-fns'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  OFFER_LETTER: 'Offer Letter',
  APPRAISAL_LETTER: 'Appraisal Letter',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
}

const COMPANY_NAME = 'Kundkund Healthcare Private Limited'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token?.trim()) {
      return errorResponse('Token is required', 400)
    }

    const document = await prisma.employeeDocument.findUnique({
      where: { ackToken: token },
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    })

    if (!document) {
      return errorResponse('Invalid or expired token', 404)
    }

    return successResponse({
      documentType: document.documentType,
      documentTypeLabel: DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType,
      employeeName: document.employee.user.name,
      companyName: COMPANY_NAME,
      generatedAt: document.generatedAt,
      generatedAtFormatted: format(new Date(document.generatedAt), 'do MMMM, yyyy'),
      acknowledgedAt: document.acknowledgedAt,
      acknowledgedAtFormatted: document.acknowledgedAt
        ? format(new Date(document.acknowledgedAt), 'PPp')
        : null,
    })
  } catch (error) {
    console.error('Error fetching document for acknowledgement:', error)
    return errorResponse('Failed to fetch document', 500)
  }
}

const postSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = postSchema.parse(body)

    const document = await prisma.employeeDocument.findUnique({
      where: { ackToken: token },
    })

    if (!document) {
      return errorResponse('Invalid or expired token', 404)
    }

    if (document.acknowledgedAt) {
      return errorResponse('Document has already been acknowledged', 400)
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const acknowledgedIp = forwardedFor?.split(',')[0]?.trim() || realIp || request.headers.get('cf-connecting-ip') || null

    await prisma.employeeDocument.update({
      where: { id: document.id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedIp,
      },
    })

    return successResponse(
      {
        acknowledgedAt: new Date().toISOString(),
        acknowledgedAtFormatted: format(new Date(), 'PPp'),
      },
      'Document acknowledged successfully'
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0]?.message ?? 'Invalid request', 400)
    }
    console.error('Error acknowledging document:', error)
    return errorResponse('Failed to acknowledge document', 500)
  }
}
