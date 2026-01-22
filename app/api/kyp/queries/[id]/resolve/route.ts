import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only Insurance team can resolve queries
    if (user.role !== 'INSURANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only Insurance team can resolve queries', 403)
    }

    const { id } = await params

    // Find query
    const query = await prisma.insuranceQuery.findUnique({
      where: { id },
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
      },
    })

    if (!query) {
      return errorResponse('Query not found', 404)
    }

    if (query.status !== 'ANSWERED') {
      return errorResponse('Query must be answered before it can be resolved', 400)
    }

    // Update query status to resolved
    const updatedQuery = await prisma.insuranceQuery.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
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
        answeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return successResponse(updatedQuery, 'Query resolved successfully')
  } catch (error) {
    console.error('Error resolving query:', error)
    return errorResponse('Failed to resolve query', 500)
  }
}
