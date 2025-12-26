import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { RequestStatus } from '@prisma/client'

const updateRequestSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  hrResponse: z.string().optional(),
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

    const requests = await prisma.mentalHealthRequest.findMany({
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

    // Add SLA status (48 hour deadline)
    const requestsWithSLA = requests.map((req) => {
      const createdAt = new Date(req.createdAt)
      const deadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000)
      const now = new Date()
      const hoursRemaining = Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
      const isOverdue = now > deadline && req.status === 'PENDING'

      return {
        ...req,
        deadline,
        hoursRemaining: Math.round(hoursRemaining),
        isOverdue,
      }
    })

    return successResponse(requestsWithSLA)
  } catch (error) {
    console.error('Error fetching mental health requests:', error)
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
    const { status, hrResponse } = updateRequestSchema.parse(body)

    const updated = await prisma.mentalHealthRequest.update({
      where: { id: requestId },
      data: {
        status,
        hrResponse: hrResponse || undefined,
        respondedAt: status !== 'PENDING' ? new Date() : undefined,
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
    console.error('Error updating mental health request:', error)
    return errorResponse('Failed to update request', 500)
  }
}

