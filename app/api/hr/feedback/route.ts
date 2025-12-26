import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { FeedbackStatus } from '@prisma/client'

const updateFeedbackSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'ACKNOWLEDGED']),
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
    const status = searchParams.get('status') as FeedbackStatus | null

    const where = status ? { status } : {}

    const feedbacks = await prisma.feedback.findMany({
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

    return successResponse(feedbacks)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return errorResponse('Failed to fetch feedback', 500)
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
    const feedbackId = searchParams.get('id')

    if (!feedbackId) {
      return errorResponse('Feedback ID required', 400)
    }

    const body = await request.json()
    const { status } = updateFeedbackSchema.parse(body)

    const feedback = await prisma.feedback.update({
      where: { id: feedbackId },
      data: { status },
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

    return successResponse(feedback, 'Feedback status updated')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid status', 400)
    }
    console.error('Error updating feedback:', error)
    return errorResponse('Failed to update feedback', 500)
  }
}

