import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { getEmployeeByUserId, getSubordinates } from "@/lib/hierarchy"
import { z } from "zod"

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["GENERAL", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
})

async function getAllowedAssigneeIds(userId: string): Promise<string[]> {
  const isMDOrAdmin = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  }).then((u) => u?.role === "MD" || u?.role === "ADMIN")
  if (isMDOrAdmin) return [] // empty means no filter: can see all
  const employee = await getEmployeeByUserId(userId)
  if (!employee) return [userId]
  const subordinates = await getSubordinates(employee.id, true)
  const subordinateUserIds = subordinates.map((s) => s.userId)
  return [userId, ...subordinateUserIds]
}

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const assigneeId = searchParams.get("assigneeId")
  const createdById = searchParams.get("createdById")
  const status = searchParams.get("status")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const allowedAssigneeIds = await getAllowedAssigneeIds(user.id)

  const where: Record<string, unknown> = {}

  if (assigneeId) {
    if (isMDOrAdmin || allowedAssigneeIds.includes(assigneeId)) {
      where.assigneeId = assigneeId
    } else {
      return errorResponse("Forbidden", 403)
    }
  } else if (!isMDOrAdmin && allowedAssigneeIds.length > 0) {
    where.assigneeId = { in: allowedAssigneeIds }
  }

  if (createdById) {
    if (createdById !== user.id) return errorResponse("Forbidden", 403)
    where.createdById = createdById
  }

  if (status) {
    where.status = status
  }

  if (startDate && endDate) {
    where.OR = [
      { dueDate: { gte: new Date(startDate), lte: new Date(endDate) } },
      { startTime: { gte: new Date(startDate), lte: new Date(endDate) } },
    ]
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  })

  return successResponse(tasks)
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const body = await request.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const assigneeId = parsed.data.assigneeId ?? user.id

  if (assigneeId !== user.id) {
    const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
    let canAssign = isMDOrAdmin
    if (!canAssign) {
      const employee = await getEmployeeByUserId(user.id)
      if (employee) {
        const subordinates = await getSubordinates(employee.id, false)
        canAssign = subordinates.some((s) => s.userId === assigneeId)
      }
    }
    if (!canAssign) {
      return errorResponse("Only your immediate manager can assign tasks to you", 403)
    }
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: (parsed.data.priority as "GENERAL" | "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM",
      assigneeId,
      createdById: user.id,
      projectId: parsed.data.projectId ?? null,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      allDay: parsed.data.allDay ?? true,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  })

  if (assigneeId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        message: `You have been assigned a new task: ${task.title}`,
        link: "/md/tasks",
        relatedId: task.id,
      },
    })
  }

  return successResponse(task)
}
