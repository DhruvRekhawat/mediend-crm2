import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const pending = await prisma.noticeRecipient.findFirst({
      where: { userId: user.id, acknowledgedAt: null },
      include: {
        notice: {
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { notice: { createdAt: 'asc' } },
    })

    if (!pending) {
      return successResponse(null)
    }

    return successResponse({
      id: pending.notice.id,
      recipientId: pending.id,
      title: pending.notice.title,
      body: pending.notice.body,
      createdAt: pending.notice.createdAt,
      createdBy: pending.notice.createdBy,
    })
  } catch (error) {
    console.error('Error fetching pending notice:', error)
    return errorResponse('Failed to fetch pending notice', 500)
  }
}
