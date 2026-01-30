import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { startOfDay, getHours, getMinutes } from "date-fns"

const INTERVALS = [
  { start: 9, end: 12, deadlineHour: 12, deadlineMinute: 30 },
  { start: 12, end: 15, deadlineHour: 15, deadlineMinute: 30 },
  { start: 15, end: 18, deadlineHour: 18, deadlineMinute: 30 },
] as const

/** Work log enforcement starts on this date. Before this, the API never blocks. */
const WORKLOG_START_DATE = new Date(2026, 1, 1) // 1 Feb 2026

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const now = dateParam ? new Date(dateParam) : new Date()

  const dayStart = startOfDay(now)
  if (dayStart < WORKLOG_START_DATE) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  const currentHour = getHours(now)
  const currentMinute = getMinutes(now)
  const currentTimeDecimal = currentHour + currentMinute / 60

  const todayLogs = await prisma.workLog.findMany({
    where: {
      employeeId: user.id,
      logDate: dayStart,
    },
  })

  const loggedIntervals = new Set(todayLogs.map((l) => l.intervalStart))

  const missingIntervals: { start: number; end: number; deadline: string }[] = []
  let isBlocked = false

  for (const interval of INTERVALS) {
    const deadlineDecimal = interval.deadlineHour + interval.deadlineMinute / 60
    const isPastDeadline = currentTimeDecimal >= deadlineDecimal

    if (isPastDeadline && !loggedIntervals.has(interval.start)) {
      missingIntervals.push({
        start: interval.start,
        end: interval.end,
        deadline: `${interval.deadlineHour.toString().padStart(2, "0")}:${interval.deadlineMinute.toString().padStart(2, "0")}`,
      })
      isBlocked = true
    }
  }

  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const isOutsideWorkHours =
    currentTimeDecimal < 9 || currentTimeDecimal >= 18.5
  const isExempt = isWeekend || isOutsideWorkHours

  return successResponse({
    complete: missingIntervals.length === 0,
    isBlocked: isBlocked && !isExempt,
    missingIntervals,
    isExempt,
    loggedIntervals: Array.from(loggedIntervals),
  })
}
