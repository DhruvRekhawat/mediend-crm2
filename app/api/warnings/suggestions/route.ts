import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  if (user.role !== "MD" && user.role !== "ADMIN") {
    return errorResponse("Forbidden", 403)
  }

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  const [overdueTasks, rejectedTasks, gradeCTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS", "EMPLOYEE_DONE"] },
        dueDate: { lt: threeDaysAgo },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: { rejectionCount: { gte: 2 } },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.findMany({
      where: { grade: "C", status: "COMPLETED" },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
  ])

  const suggestions: {
    type: "OVERDUE_3_DAYS" | "REJECTED_MULTIPLE" | "GRADE_C"
    taskId: string
    taskTitle: string
    employeeId: string
    employeeName: string
    reason: string
  }[] = []

  overdueTasks.forEach((t) => {
    suggestions.push({
      type: "OVERDUE_3_DAYS",
      taskId: t.id,
      taskTitle: t.title,
      employeeId: t.assigneeId,
      employeeName: t.assignee?.name ?? "",
      reason: "Task overdue by more than 3 days",
    })
  })
  rejectedTasks.forEach((t) => {
    suggestions.push({
      type: "REJECTED_MULTIPLE",
      taskId: t.id,
      taskTitle: t.title,
      employeeId: t.assigneeId,
      employeeName: t.assignee?.name ?? "",
      reason: `Task rejected ${t.rejectionCount} times`,
    })
  })
  gradeCTasks.forEach((t) => {
    suggestions.push({
      type: "GRADE_C",
      taskId: t.id,
      taskTitle: t.title,
      employeeId: t.assigneeId,
      employeeName: t.assignee?.name ?? "",
      reason: "Task completed with grade C",
    })
  })

  return successResponse(suggestions)
}
