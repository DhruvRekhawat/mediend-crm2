import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const { id: taskId } = await params
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, assigneeId: true, createdById: true },
  })

  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const isAssignee = task.assigneeId === user.id
  const isCreator = task.createdById === user.id
  if (!isAssignee && !isCreator && !isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  await prisma.userTaskSeen.upsert({
    where: {
      userId_taskId: { userId: user.id, taskId },
    },
    create: {
      userId: user.id,
      taskId,
    },
    update: {
      lastSeenAt: new Date(),
    },
  })

  return successResponse({ ok: true })
}
