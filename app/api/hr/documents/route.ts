import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { 
  generateOfferLetterHTML, 
  generateAppraisalLetterHTML, 
  generateExperienceLetterHTML, 
  generateRelievingLetterHTML 
} from '@/lib/hrms/document-templates'
import { z } from 'zod'
import { DocumentType } from '@prisma/client'

const generateDocumentSchema = z.object({
  employeeId: z.string(),
  documentType: z.enum(['OFFER_LETTER', 'APPRAISAL_LETTER', 'EXPERIENCE_LETTER', 'RELIEVING_LETTER']),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const { employeeId, documentType, metadata } = generateDocumentSchema.parse(body)

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
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
    })

    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    const employeeData = {
      name: employee.user.name,
      employeeCode: employee.employeeCode,
      email: employee.user.email,
      department: employee.department?.name,
      joinDate: employee.joinDate,
      salary: employee.salary,
    }

    let htmlContent: string

    switch (documentType) {
      case 'OFFER_LETTER':
        htmlContent = generateOfferLetterHTML(employeeData, metadata)
        break
      case 'APPRAISAL_LETTER':
        htmlContent = generateAppraisalLetterHTML(employeeData, metadata)
        break
      case 'EXPERIENCE_LETTER':
        htmlContent = generateExperienceLetterHTML(employeeData, metadata)
        break
      case 'RELIEVING_LETTER':
        htmlContent = generateRelievingLetterHTML(employeeData, metadata)
        break
      default:
        return errorResponse('Invalid document type', 400)
    }

    // Save document record
    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentType: documentType as DocumentType,
        metadata: metadata || {},
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return successResponse({
      document,
      htmlContent,
    }, 'Document generated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error generating document:', error)
    return errorResponse('Failed to generate document', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const where = employeeId ? { employeeId } : {}

    const documents = await prisma.employeeDocument.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        generatedAt: 'desc',
      },
    })

    return successResponse(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return errorResponse('Failed to fetch documents', 500)
  }
}

