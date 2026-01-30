import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  if (!isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  const approvals = await prisma.taskDueDateApproval.findMany({
    where: { status: "PENDING" },
    include: {
      task: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return successResponse(approvals)
}
