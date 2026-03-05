import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createCommentSchema = z.object({
  content: z.string().min(1),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const { id: taskId } = await params

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, createdById: true },
  })
  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const canView = task.assigneeId === user.id || task.createdById === user.id || isMDOrAdmin
  if (!canView) return errorResponse("Forbidden", 403)

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return successResponse(comments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { id: taskId } = await params

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, createdById: true },
  })
  if (!task) return errorResponse("Task not found", 404)

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const canComment = task.assigneeId === user.id || task.createdById === user.id || isMDOrAdmin
  if (!canComment) return errorResponse("Forbidden", 403)

  const body = await request.json()
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: user.id,
      content: parsed.data.content.trim(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return successResponse(comment)
}
