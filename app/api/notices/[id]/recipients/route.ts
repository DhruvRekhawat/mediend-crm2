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
    if (!user) return unauthorizedResponse()

    const { id: noticeId } = await params

    const notice = await prisma.notice.findUnique({
      where: { id: noticeId },
      select: { createdById: true },
    })

    if (!notice) {
      return errorResponse('Notice not found', 404)
    }

    if (notice.createdById !== user.id) {
      return errorResponse('You can only view recipients for notices you created', 403)
    }

    const recipients = await prisma.noticeRecipient.findMany({
      where: { noticeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { acknowledgedAt: 'asc' },
    })

    const result = recipients.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      acknowledgedAt: r.acknowledgedAt,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('Error fetching notice recipients:', error)
    return errorResponse('Failed to fetch recipients', 500)
  }
}
