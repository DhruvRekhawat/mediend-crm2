import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push"
import { startOfDay, endOfDay } from "date-fns"

const REQUIRED_INTERVALS = [
  { start: 9, end: 11, deadlineHour: 11, deadlineMinute: 30, label: "9:00 AM - 11:00 AM" },
  { start: 11, end: 13, deadlineHour: 13, deadlineMinute: 30, label: "11:00 AM - 1:00 PM" },
  { start: 13, end: 15, deadlineHour: 15, deadlineMinute: 30, label: "1:00 PM - 3:00 PM" },
  { start: 15, end: 17, deadlineHour: 17, deadlineMinute: 30, label: "3:00 PM - 5:00 PM" },
  { start: 17, end: 19, deadlineHour: 19, deadlineMinute: 30, label: "5:00 PM - 7:00 PM" },
] as const

/**
 * Sends push reminders for work log deadlines.
 * Run every 15-30 min (e.g. at :20 and :50) via cron.
 * Uses tzOffsetMinutes query param for target timezone (default 330 = IST).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startTime = Date.now()
  const jobName = "work_log_reminders"

  try {
    const { searchParams } = new URL(request.url)
    const tzOffsetMinutes = Number(searchParams.get("tzOffsetMinutes") ?? 330)
    const now = new Date()
    const clientLocalMs = now.getTime() + tzOffsetMinutes * 60 * 1000
    const clientLocal = new Date(clientLocalMs)
    const dayOfWeek = clientLocal.getUTCDay()
    const currentHour = clientLocal.getUTCHours()
    const currentMinute = clientLocal.getUTCMinutes()
    const currentDecimal = currentHour + currentMinute / 60

    if (dayOfWeek === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: "Sunday" })
    }

    const dayStart = new Date(
      Date.UTC(
        clientLocal.getUTCFullYear(),
        clientLocal.getUTCMonth(),
        clientLocal.getUTCDate()
      )
    )
    const dayEnd = endOfDay(clientLocal)

    let targetInterval: (typeof REQUIRED_INTERVALS)[number] | null = null
    const reminderWindowStart = 0.25
    for (const interval of REQUIRED_INTERVALS) {
      const deadlineDecimal = interval.deadlineHour + interval.deadlineMinute / 60
      const windowStart = deadlineDecimal - reminderWindowStart
      if (currentDecimal >= windowStart && currentDecimal < deadlineDecimal) {
        targetInterval = interval
        break
      }
    }

    if (!targetInterval) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        reason: "No reminder window",
        currentDecimal,
      })
    }

    const teamMemberUserIds = await prisma.mDTaskTeamMember.findMany({
      where: { team: { owner: { role: "MD" } } },
      select: { employee: { select: { userId: true } } },
    })
    const watchlistUserIds = await prisma.mDWatchlistEmployee.findMany({
      select: { employee: { select: { userId: true } } },
    })
    const userIds = new Set<string>()
    for (const m of teamMemberUserIds) {
      if (m.employee?.userId) userIds.add(m.employee.userId)
    }
    for (const w of watchlistUserIds) {
      if (w.employee?.userId) userIds.add(w.employee.userId)
    }

    const employees = await prisma.employee.findMany({
      where: { userId: { in: Array.from(userIds) } },
      select: { id: true, userId: true },
    })

    const onLeaveEmployeeIds = new Set(
      (
        await prisma.leaveRequest.findMany({
          where: {
            employeeId: { in: employees.map((e) => e.id) },
            status: "APPROVED",
            startDate: { lte: dayEnd },
            endDate: { gte: dayStart },
          },
          select: { employeeId: true },
        })
      ).map((l) => l.employeeId)
    )

    const todayLogs = await prisma.workLog.findMany({
      where: {
        employeeId: { in: Array.from(userIds) },
        logDate: dayStart,
        intervalStart: targetInterval.start,
      },
      select: { employeeId: true },
    })
    const loggedUserIds = new Set(todayLogs.map((l) => l.employeeId))

    const needReminderUserIds = employees
      .filter(
        (e) =>
          !onLeaveEmployeeIds.has(e.id) &&
          !loggedUserIds.has(e.userId)
      )
      .map((e) => e.userId)

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: needReminderUserIds } },
      select: { userId: true, endpoint: true, p256dh: true, auth: true },
    })

    let sent = 0
    for (const sub of subscriptions) {
      const ok = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        {
          title: "Work log reminder",
          body: `Time to log your work for ${targetInterval.label}`,
          url: "/home",
        }
      )
      if (ok) sent++
    }

    const durationMs = Date.now() - startTime
    await prisma.cronJobLog.create({
      data: {
        jobName,
        status: "success",
        durationMs,
        recordsProcessed: sent,
        message: `Sent ${sent} reminders for ${targetInterval.label}`,
      },
    })

    return NextResponse.json({
      ok: true,
      sent,
      interval: targetInterval.label,
      durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await prisma.cronJobLog.create({
      data: {
        jobName,
        status: "error",
        durationMs,
        recordsProcessed: 0,
        message: "Work log reminders failed",
        error: errorMessage,
      },
    })
    return NextResponse.json(
      { error: errorMessage, jobName, durationMs },
      { status: 500 }
    )
  }
}
