import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createFeedbackSchema = z.object({
  content: z.string().min(10, 'Feedback must be at least 10 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      include: { user: { select: { name: true } } },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const body = await request.json()
    const { content } = createFeedbackSchema.parse(body)

    const feedback = await prisma.feedback.create({
      data: {
        employeeId: employee.id,
        content,
      },
    })

    // Notify all HR_HEAD users
    const hrHeads = await prisma.user.findMany({
      where: { role: 'HR_HEAD' },
      select: { id: true },
    })
    const empName = employee.user?.name ?? user.name ?? 'An employee'
    if (hrHeads.length > 0) {
      await prisma.notification.createMany({
        data: hrHeads.map((h) => ({
          userId: h.id,
          type: 'FEEDBACK_SUBMITTED',
          title: 'New Feedback Submitted',
          message: `${empName} has submitted feedback`,
          link: '/hr/engagement',
          relatedId: feedback.id,
        })),
      })
    }

    return successResponse(feedback, 'Feedback submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error submitting feedback:', error)
    return errorResponse('Failed to submit feedback', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(feedbacks)
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return errorResponse('Failed to fetch feedback', 500)
  }
}

