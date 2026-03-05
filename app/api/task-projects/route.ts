import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const projects = await prisma.taskProject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdById: true,
      createdAt: true,
      _count: { select: { tasks: true } },
    },
  })

  return successResponse(projects)
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const body = await request.json()
  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const existing = await prisma.taskProject.findUnique({
    where: { name: parsed.data.name.trim() },
  })
  if (existing) {
    return successResponse(existing)
  }

  const project = await prisma.taskProject.create({
    data: {
      name: parsed.data.name.trim(),
      createdById: user.id,
    },
  })

  return successResponse(project)
}
