import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'insurance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const caseStatus = searchParams.get('caseStatus')

    const where: any = {
      lead: {
        pipelineStage: 'INSURANCE',
      },
    }

    if (startDate || endDate) {
      where.submittedAt = {}
      if (startDate) where.submittedAt.gte = new Date(startDate)
      if (endDate) where.submittedAt.lte = new Date(endDate)
    }

    if (caseStatus) {
      where.caseStatus = caseStatus
    }

    const cases = await prisma.insuranceCase.findMany({
      where,
      include: {
        lead: {
          include: {
            bd: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        handledBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    return successResponse(cases)
  } catch (error) {
    console.error('Error fetching insurance cases:', error)
    return errorResponse('Failed to fetch insurance cases', 500)
  }
}

