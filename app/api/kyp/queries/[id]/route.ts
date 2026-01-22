import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params

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

    if (!query) {
      return errorResponse('Query not found', 404)
    }

    return successResponse(query)
  } catch (error) {
    console.error('Error fetching query:', error)
    return errorResponse('Failed to fetch query', 500)
  }
}
