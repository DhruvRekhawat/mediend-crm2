import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { hasFeaturePermission } from '@/lib/permissions'
import { getMDTeamAndWatchlistUserIds } from '@/lib/hierarchy'
import { z } from 'zod'

const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  targetType: z.enum(['EVERYONE', 'EVERYONE_EXCEPT_MD', 'DEPARTMENT', 'SPECIFIC']),
  targetDepartmentId: z.string().optional().nullable(),
  targetUserIds: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const canCreate = await hasFeaturePermission(user.id, 'create_notice')
    if (!canCreate) {
      return errorResponse('You do not have permission to create notices', 403)
    }

    const body = await request.json()
    const parsed = createNoticeSchema.parse(body)

    if (parsed.targetType === 'DEPARTMENT' && !parsed.targetDepartmentId) {
      return errorResponse('Department is required when target type is DEPARTMENT', 400)
    }
    if (parsed.targetType === 'SPECIFIC' && (!parsed.targetUserIds || parsed.targetUserIds.length === 0)) {
      return errorResponse('At least one user is required when target type is SPECIFIC', 400)
    }

    let recipientUserIds: string[] = []

    if (parsed.targetType === 'EVERYONE') {
      const users = await prisma.user.findMany({ select: { id: true } })
      recipientUserIds = users.map((u) => u.id)
    } else if (parsed.targetType === 'EVERYONE_EXCEPT_MD') {
      const users = await prisma.user.findMany({
        where: { role: { not: 'MD' } },
        select: { id: true },
      })
      recipientUserIds = users.map((u) => u.id)
    } else if (parsed.targetType === 'DEPARTMENT' && parsed.targetDepartmentId) {
      const employees = await prisma.employee.findMany({
        where: { departmentId: parsed.targetDepartmentId },
        select: { userId: true },
      })
      recipientUserIds = employees.map((e) => e.userId).filter(Boolean)
    } else if (parsed.targetType === 'SPECIFIC' && parsed.targetUserIds) {
      recipientUserIds = parsed.targetUserIds
    }

    const notice = await prisma.notice.create({
      data: {
        title: parsed.title,
        body: parsed.body,
        createdById: user.id,
        targetType: parsed.targetType,
        targetDepartmentId: parsed.targetDepartmentId ?? undefined,
      },
    })

    await prisma.noticeRecipient.createMany({
      data: recipientUserIds.map((userId) => ({
        noticeId: notice.id,
        userId,
      })),
    })

    // Create notifications for each recipient
    await prisma.notification.createMany({
      data: recipientUserIds.map((userId) => ({
        userId,
        type: 'NOTICE_PUBLISHED',
        title: 'New Notice',
        message: parsed.title,
        link: '/home',
        relatedId: notice.id,
      })),
    })

    return successResponse(notice, 'Notice created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error creating notice:', error)
    return errorResponse('Failed to create notice', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()

    const notices = await prisma.noticeRecipient.findMany({
      where: { userId: user.id },
      include: {
        notice: {
          include: {
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { notice: { createdAt: 'desc' } },
    })

    const result = notices.map((nr) => ({
      id: nr.notice.id,
      title: nr.notice.title,
      body: nr.notice.body,
      createdAt: nr.notice.createdAt,
      createdBy: nr.notice.createdBy,
      acknowledgedAt: nr.acknowledgedAt,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('Error fetching notices:', error)
    return errorResponse('Failed to fetch notices', 500)
  }
}
