import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, getHours, getMinutes } from "date-fns"

// Required intervals (morning catch-up 0-9 is optional, not enforced)
const REQUIRED_INTERVALS = [
  { start: 9, end: 11, deadlineHour: 11, deadlineMinute: 30 },
  { start: 11, end: 13, deadlineHour: 13, deadlineMinute: 30 },
  { start: 13, end: 15, deadlineHour: 15, deadlineMinute: 30 },
  { start: 15, end: 17, deadlineHour: 17, deadlineMinute: 30 },
  { start: 17, end: 19, deadlineHour: 19, deadlineMinute: 30 },
] as const

/** Work log enforcement starts on this date. Before this, the API never blocks. */
const WORKLOG_START_DATE = new Date(2026, 1, 1) // 1 Feb 2026

export async function GET(request: NextRequest) {
  const user = getSessionFromRequest(request)
  if (!user) return unauthorizedResponse()

  if (user.role === "MD" || user.role === "ADMIN") {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  // Only enforce for MD team members or MD watchlist members
  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
    select: { id: true },
  })
  if (!employee) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  const inTeam = await prisma.mDTaskTeamMember.findFirst({
    where: {
      employeeId: employee.id,
      team: { owner: { role: "MD" } },
    },
    select: { id: true },
  })
  const inWatchlist = await prisma.mDWatchlistEmployee.findFirst({
    where: { employeeId: employee.id },
    select: { id: true },
  })
  if (!inTeam && !inWatchlist) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const tzOffsetParam = searchParams.get("tzOffsetMinutes")
  const now = dateParam ? new Date(dateParam) : new Date()
  const tzOffsetMinutes = tzOffsetParam != null ? Number(tzOffsetParam) : 0

  let dayStart: Date
  let currentTimeDecimal: number
  let dayForWeekend: Date

  if (tzOffsetParam != null && !Number.isNaN(tzOffsetMinutes)) {
    const clientLocalMs = now.getTime() + tzOffsetMinutes * 60 * 1000
    dayForWeekend = new Date(clientLocalMs)
    const y = dayForWeekend.getUTCFullYear()
    const m = dayForWeekend.getUTCMonth()
    const d = dayForWeekend.getUTCDate()
    dayStart = new Date(Date.UTC(y, m, d))
    const clientLocalHours = (clientLocalMs / (60 * 60 * 1000)) % 24
    currentTimeDecimal = clientLocalHours >= 0 ? clientLocalHours : clientLocalHours + 24
  } else {
    dayStart = startOfDay(now)
    currentTimeDecimal = getHours(now) + getMinutes(now) / 60
    dayForWeekend = now
  }

  if (dayStart < WORKLOG_START_DATE) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  // Sunday exemption
  const dayOfWeek =
    tzOffsetParam != null && !Number.isNaN(tzOffsetMinutes)
      ? dayForWeekend.getUTCDay()
      : dayForWeekend.getDay()
  if (dayOfWeek === 0) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  // Leave exemption
  const dayEnd = endOfDay(dayForWeekend)
  const onLeave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: "APPROVED",
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
    select: { id: true },
  })
  if (onLeave) {
    return successResponse({
      complete: true,
      isBlocked: false,
      missingIntervals: [],
      isExempt: true,
      loggedIntervals: [],
    })
  }

  const todayLogs = await prisma.workLog.findMany({
    where: {
      employeeId: user.id,
      logDate: dayStart,
    },
  })

  const loggedIntervals = new Set(todayLogs.map((l) => l.intervalStart))

  const missingIntervals: { start: number; end: number; deadline: string }[] = []
  let isBlocked = false

  for (const interval of REQUIRED_INTERVALS) {
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

  const isWeekend = dayOfWeek === 6
  const isOutsideWorkHours =
    currentTimeDecimal < 9 || currentTimeDecimal >= 19.5
  const isExempt = isWeekend || isOutsideWorkHours

  return successResponse({
    complete: missingIntervals.length === 0,
    isBlocked: isBlocked && !isExempt,
    missingIntervals,
    isExempt,
    loggedIntervals: Array.from(loggedIntervals),
  })
}
