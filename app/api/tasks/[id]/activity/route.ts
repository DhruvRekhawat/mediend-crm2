import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

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

  const activity = await prisma.taskActivityLog.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return successResponse(activity)
}
