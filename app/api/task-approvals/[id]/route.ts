import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const approveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  if (!isMDOrAdmin) {
    return errorResponse("Forbidden", 403)
  }

  const { id } = await params
  const approval = await prisma.taskDueDateApproval.findUnique({
    where: { id },
    include: { task: true },
  })

  if (!approval) return errorResponse("Approval not found", 404)
  if (approval.status !== "PENDING") {
    return errorResponse("Approval already processed", 400)
  }

  const body = await request.json()
  const parsed = approveSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  await prisma.taskDueDateApproval.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  if (parsed.data.status === "APPROVED") {
    await prisma.task.update({
      where: { id: approval.taskId },
      data: { dueDate: approval.newDueDate },
    })

    await prisma.notification.create({
      data: {
        userId: approval.requestedById,
        type: "DUE_DATE_CHANGE_APPROVED",
        title: "Due Date Change Approved",
        message: `Your due date change request for task "${approval.task.title}" has been approved`,
        link: `/calendar`,
        relatedId: approval.taskId,
      },
    })
  } else {
    await prisma.notification.create({
      data: {
        userId: approval.requestedById,
        type: "DUE_DATE_CHANGE_REJECTED",
        title: "Due Date Change Rejected",
        message: `Your due date change request for task "${approval.task.title}" has been rejected`,
        link: `/calendar`,
        relatedId: approval.taskId,
      },
    })
  }

  return successResponse({ status: parsed.data.status })
}
