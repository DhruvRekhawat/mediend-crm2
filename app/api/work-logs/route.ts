import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { startOfDay } from "date-fns"

const createWorkLogSchema = z.object({
  logDate: z.string().datetime(),
  intervalStart: z.number().refine((v) => [9, 12, 15].includes(v)),
  intervalEnd: z.number().refine((v) => [12, 15, 18].includes(v)),
  description: z.string().min(1),
})

const INTERVALS = [
  { start: 9, end: 12 },
  { start: 12, end: 15 },
  { start: 15, end: 18 },
] as const

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const employeeId = searchParams.get("employeeId")

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const targetEmployeeId = employeeId && isMDOrAdmin ? employeeId : user.id

  if (employeeId && !isMDOrAdmin && employeeId !== user.id) {
    return errorResponse("Forbidden", 403)
  }

  if (!startDate || !endDate) {
    return errorResponse("startDate and endDate are required")
  }

  const logs = await prisma.workLog.findMany({
    where: {
      employeeId: targetEmployeeId,
      logDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: [{ logDate: "desc" }, { intervalStart: "asc" }],
  })

  return successResponse(logs)
}

export async function POST(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const body = await request.json()
  const parsed = createWorkLogSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.message)
  }

  const logDate = new Date(parsed.data.logDate)
  const dayStart = startOfDay(logDate)
  const dayEnd = new Date(dayStart)
  dayEnd.setHours(23, 59, 59, 999)

  const validInterval = INTERVALS.some(
    (i) => i.start === parsed.data.intervalStart && i.end === parsed.data.intervalEnd
  )
  if (!validInterval) {
    return errorResponse("Invalid interval. Use 9-12, 12-15, or 15-18")
  }

  const log = await prisma.workLog.upsert({
    where: {
      employeeId_logDate_intervalStart: {
        employeeId: user.id,
        logDate: dayStart,
        intervalStart: parsed.data.intervalStart,
      },
    },
    create: {
      employeeId: user.id,
      logDate: dayStart,
      intervalStart: parsed.data.intervalStart,
      intervalEnd: parsed.data.intervalEnd,
      description: parsed.data.description,
    },
    update: {
      intervalEnd: parsed.data.intervalEnd,
      description: parsed.data.description,
    },
  })

  return successResponse(log)
}
