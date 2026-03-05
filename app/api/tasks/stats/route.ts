import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { getEmployeeByUserId, getSubordinates } from "@/lib/hierarchy"

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  let assigneeWhere: { assigneeId: { in: string[] } } | undefined
  if (!isMDOrAdmin) {
    const employee = await getEmployeeByUserId(user.id)
    if (!employee) {
      assigneeWhere = { assigneeId: { in: [user.id] } }
    } else {
      const subordinates = await getSubordinates(employee.id, true)
      const subordinateUserIds = subordinates.map((s) => s.userId)
      assigneeWhere = { assigneeId: { in: [user.id, ...subordinateUserIds] } }
    }
  }

  const baseWhere = assigneeWhere ?? {}

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [total, completed, pending, overdue, byProject, byAssignee] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.count({ where: { ...baseWhere, status: "COMPLETED" } }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: startOfToday },
      },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: baseWhere,
      _count: { id: true },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: baseWhere,
      _count: { id: true },
    }),
  ])

  const projectIds = [...new Set(byProject.map((p) => p.projectId).filter(Boolean))] as string[]
  const projects = projectIds.length
    ? await prisma.taskProject.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      })
    : []
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]))

  const projectWise = byProject.map((p) => ({
    projectId: p.projectId,
    projectName: p.projectId ? projectMap[p.projectId] ?? "Unknown" : "No project",
    count: p._count.id,
  }))

  const assigneeIds = [...new Set(byAssignee.map((a) => a.assigneeId))]
  const assignees =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true },
        })
      : []
  const assigneeMap = Object.fromEntries(assignees.map((a) => [a.id, a.name]))

  const completedByAssignee = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: { ...baseWhere, status: "COMPLETED" },
    _count: { id: true },
  })
  const completedMap = Object.fromEntries(completedByAssignee.map((c) => [c.assigneeId, c._count.id]))

  const employeeWise = byAssignee.map((a) => ({
    assigneeId: a.assigneeId,
    assigneeName: assigneeMap[a.assigneeId] ?? "Unknown",
    total: a._count.id,
    completed: completedMap[a.assigneeId] ?? 0,
  }))

  return successResponse({
    total,
    completed,
    pending,
    overdue,
    projectWise,
    employeeWise,
  })
}
