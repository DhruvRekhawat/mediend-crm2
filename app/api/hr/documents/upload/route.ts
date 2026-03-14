import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { uploadFileToS3 } from '@/lib/s3-client'
import { DocumentType } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const employeeId = formData.get('employeeId') as string | null
    const title = (formData.get('title') as string | null)?.trim() || null

    if (!file) {
      return errorResponse('No file provided', 400)
    }

    if (!employeeId) {
      return errorResponse('Employee ID is required', 400)
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return errorResponse('Employee not found', 404)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await uploadFileToS3(buffer, file.name, 'hr/documents')

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentType: DocumentType.CUSTOM,
        documentUrl: result.url,
        title,
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

    return successResponse(document, 'Document uploaded successfully')
  } catch (error) {
    console.error('Error uploading document:', error)
    return errorResponse('Failed to upload document', 500)
  }
}
