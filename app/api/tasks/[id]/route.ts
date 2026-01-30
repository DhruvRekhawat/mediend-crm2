import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      approvals: { include: { requestedBy: { select: { id: true, name: true } } } },
    },
  })

  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  if (task.assigneeId !== user.id && !isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  return successResponse(task)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const isAssignee = task.assigneeId === user.id

  if (!isAssignee && !isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  const body = await request.json()
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const wasAssignedByMD = task.createdById !== task.assigneeId

  if (
    parsed.data.dueDate !== undefined &&
    task.dueDate?.toISOString() !== parsed.data.dueDate &&
    wasAssignedByMD &&
    !isMDOrAdmin
  ) {
    const newDue = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
    const approval = await prisma.taskDueDateApproval.create({
      data: {
        taskId: id,
        requestedById: user.id,
        oldDueDate: task.dueDate,
        newDueDate: newDue,
        status: "PENDING",
      },
    })

    const requestingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    })
    const requesterName = requestingUser?.name || "An employee"

    await prisma.notification.create({
      data: {
        userId: task.createdById,
        type: "DUE_DATE_CHANGE_REQUESTED",
        title: "Due Date Change Requested",
        message: `${requesterName} requested to change due date for task: ${task.title}`,
        link: `/md/tasks`,
        relatedId: approval.id,
      },
    })

    return successResponse({
      message: "Due date change requires MD approval",
      approvalId: approval.id,
    })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.startTime !== undefined) updateData.startTime = parsed.data.startTime ? new Date(parsed.data.startTime) : null
  if (parsed.data.endTime !== undefined) updateData.endTime = parsed.data.endTime ? new Date(parsed.data.endTime) : null
  if (parsed.data.allDay !== undefined) updateData.allDay = parsed.data.allDay

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return successResponse(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const { id } = await params
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const isAssignee = task.assigneeId === user.id

  if (!isAssignee && !isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  await prisma.task.delete({ where: { id } })
  return successResponse({ deleted: true })
}
