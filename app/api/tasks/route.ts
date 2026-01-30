import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const assigneeId = searchParams.get("assigneeId")
  const status = searchParams.get("status")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"

  const where: Record<string, unknown> = {}

  if (assigneeId) {
    if (isMDOrAdmin) {
      where.assigneeId = assigneeId
    } else if (assigneeId !== user.id) {
      return errorResponse("Forbidden", 403)
    } else {
      where.assigneeId = assigneeId
    }
  } else if (!isMDOrAdmin) {
    where.assigneeId = user.id
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

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const assigneeId = parsed.data.assigneeId ?? user.id

  if (assigneeId !== user.id && !isMDOrAdmin) {
    return errorResponse("Only MD/Admin can assign tasks to others", 403)
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: (parsed.data.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM",
      assigneeId,
      createdById: user.id,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
      allDay: parsed.data.allDay ?? true,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (assigneeId !== user.id && isMDOrAdmin) {
    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        message: `You have been assigned a new task: ${task.title}`,
        link: `/calendar`,
        relatedId: task.id,
      },
    })
  }

  return successResponse(task)
}
