import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createQuerySchema = z.object({
  preAuthorizationId: z.string(),
  question: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const preAuthorizationId = searchParams.get('preAuthorizationId')
    const status = searchParams.get('status')

    const where: any = {}
    if (preAuthorizationId) {
      where.preAuthorizationId = preAuthorizationId
    }
    if (status) {
      where.status = status
    }

    const queries = await prisma.insuranceQuery.findMany({
      where,
      include: {
        preAuthorization: {
          include: {
            kypSubmission: {
              include: {
                lead: {
                  select: {
                    id: true,
                    leadRef: true,
                    patientName: true,
                  },
                },
              },
            },
          },
        },
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        answeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        raisedAt: 'desc',
      },
    })

    return successResponse(queries)
  } catch (error) {
    console.error('Error fetching queries:', error)
    return errorResponse('Failed to fetch queries', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only Insurance team can raise queries
    if (user.role !== 'INSURANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only Insurance team can raise queries', 403)
    }

    const body = await request.json()
    const data = createQuerySchema.parse(body)

    // Check if pre-authorization exists
    const preAuth = await prisma.preAuthorization.findUnique({
      where: { id: data.preAuthorizationId },
      include: {
        kypSubmission: {
          include: {
            lead: {
              select: {
                id: true,
                leadRef: true,
                patientName: true,
                bdId: true,
              },
            },
            submittedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!preAuth) {
      return errorResponse('Pre-authorization not found', 404)
    }

    // Create query
    const query = await prisma.insuranceQuery.create({
      data: {
        preAuthorizationId: data.preAuthorizationId,
        question: data.question,
        raisedById: user.id,
        status: 'PENDING',
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Create notification for the BD who submitted KYP
    await prisma.notification.create({
      data: {
        userId: preAuth.kypSubmission.submittedById,
        type: 'QUERY_RAISED',
        title: 'New Query Raised',
        message: `Insurance team has raised a query for ${preAuth.kypSubmission.lead.patientName} (${preAuth.kypSubmission.lead.leadRef})`,
        link: `/patient/${preAuth.kypSubmission.lead.id}/pre-auth`,
        relatedId: query.id,
      },
    })

    return successResponse(query, 'Query raised successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating query:', error)
    return errorResponse('Failed to create query', 500)
  }
}
