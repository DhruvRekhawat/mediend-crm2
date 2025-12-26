import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { RequestStatus } from '@prisma/client'

const updateRequestSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  approvalPercentage: z.number().min(0).max(100).optional(),
  hrRemarks: z.string().optional(),
})

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
    const status = searchParams.get('status') as RequestStatus | null

    const where = status ? { status } : {}

    const requests = await prisma.incrementRequest.findMany({
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
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(requests)
  } catch (error) {
    console.error('Error fetching increment requests:', error)
    return errorResponse('Failed to fetch requests', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'hrms:employees:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return errorResponse('Request ID required', 400)
    }

    const body = await request.json()
    const { status, approvalPercentage, hrRemarks } = updateRequestSchema.parse(body)

    const updated = await prisma.incrementRequest.update({
      where: { id: requestId },
      data: {
        status,
        approvalPercentage: approvalPercentage || undefined,
        hrRemarks: hrRemarks || undefined,
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

    return successResponse(updated, 'Request updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid data', 400)
    }
    console.error('Error updating increment request:', error)
    return errorResponse('Failed to update request', 500)
  }
}

