import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { getMDTeamAndWatchlistUserIds } from "@/lib/hierarchy"
import { z } from "zod"

const createWarningSchema = z.object({
  employeeId: z.string().min(1),
  taskId: z.string().min(1),
  type: z.enum(["REPEATED_DEADLINE_MISS", "LOW_QUALITY_WORK", "UNRESPONSIVE", "TASK_ABANDONMENT", "OTHER"]),
  note: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const isAdmin = user.role === "ADMIN"
  const isMD = user.role === "MD"
  let warningWhere: { employee?: { userId: { in: string[] } } } | { employeeId: string } = {}
  if (!isAdmin && !isMD) {
    warningWhere = { employeeId: user.id }
  } else if (isMD) {
    const ids = await getMDTeamAndWatchlistUserIds(user.id)
    if (ids.length > 0) {
      warningWhere = { employee: { userId: { in: ids } } }
    }
  }

  const warnings = await prisma.warning.findMany({
    where: warningWhere,
    include: {
      employee: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      issuedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return successResponse(warnings)
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  if (user.role !== "MD" && user.role !== "ADMIN") {
    return errorResponse("Only managers can issue warnings", 403)
  }

  const body = await request.json()
  const parsed = createWarningSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const warning = await prisma.warning.create({
    data: {
      employeeId: parsed.data.employeeId,
      taskId: parsed.data.taskId,
      type: parsed.data.type,
      note: parsed.data.note.trim(),
      issuedById: user.id,
    },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  })

  return successResponse(warning)
}
