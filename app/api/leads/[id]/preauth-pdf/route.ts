import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const generatePDFSchema = z.object({
  recipients: z.array(z.string()).optional(),
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

    if (user.role !== 'INSURANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only Insurance can generate PDFs', 403)
    }

    const { id: leadId } = await params
    const body = await request.json()
    const data = generatePDFSchema.parse(body)

    // Check if lead exists and get pre-auth data
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

    if (!lead || !lead.kypSubmission || !lead.kypSubmission.preAuthData) {
      return errorResponse('Pre-authorization not found', 404)
    }

    const preAuth = lead.kypSubmission.preAuthData

    // Get latest PDF version
    const latestPDF = await prisma.preAuthPDF.findFirst({
      where: { preAuthorizationId: preAuth.id },
      orderBy: { version: 'desc' },
    })

    const nextVersion = latestPDF ? latestPDF.version + 1 : 1

    // TODO: Generate PDF using template
    // For now, we'll create a placeholder URL
    // In production, this should call a PDF generation service
    const pdfUrl = `/api/preauth-pdf/${preAuth.id}/version/${nextVersion}`

    // Create PDF record
    const pdfRecord = await prisma.preAuthPDF.create({
      data: {
        preAuthorizationId: preAuth.id,
        version: nextVersion,
        pdfUrl,
        recipients: data.recipients || [],
        sentAt: data.recipients && data.recipients.length > 0 ? new Date() : null,
        createdById: user.id,
      },
    })

    return successResponse(pdfRecord, 'PDF generated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error generating PDF:', error)
    return errorResponse('Failed to generate PDF', 500)
  }
}
