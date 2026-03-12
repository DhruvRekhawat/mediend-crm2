import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/tasks/activity?assigneeId=xxx
 * Returns task activity logs for all tasks assigned to the given employee.
 * MD/ADMIN only.
 */
export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  if (user.role !== "MD" && user.role !== "ADMIN") {
    return errorResponse("Forbidden", 403)
  }

  const assigneeId = request.nextUrl.searchParams.get("assigneeId")
  if (!assigneeId) {
    return errorResponse("assigneeId is required", 400)
  }

  const activity = await prisma.taskActivityLog.findMany({
    where: {
      task: { assigneeId },
    },
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return successResponse(activity)
}
