import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/session"
import { getEmployeeByUserId, getSubordinates } from "@/lib/hierarchy"
import { errorResponse, successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { startOfDay, endOfDay } from "date-fns"

export type TeamMemberSource = "team" | "watchlist" | "subordinate"
export type AttendanceStatus = "in" | "out" | "leave"

export interface MDTeamOverviewMember {
  id: string // userId for assignment
  employeeId: string
  name: string
  email: string
  role: string
  designation: string | null
  department: { id: string; name: string } | null
  taskCount: number
  overdueCount: number
  attendanceStatus: AttendanceStatus
  inTime: string | null
  source: TeamMemberSource
}

function requireMDOrAdmin(user: { role: string }) {
  return user.role === "MD" || user.role === "ADMIN"
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) return unauthorizedResponse()
    if (!requireMDOrAdmin(user)) {
      return errorResponse("Forbidden", 403)
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim().toLowerCase() ?? ""

    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    // 1. Direct subordinates
    const mdEmployee = await getEmployeeByUserId(user.id)
    const subordinateEmployees = mdEmployee
      ? await getSubordinates(mdEmployee.id, false)
      : []

    // 2. MD task team members (all teams owned by this user)
    const taskTeams = await prisma.mDTaskTeam.findMany({
      where: { ownerId: user.id },
      include: {
        members: {
          include: {
            employee: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })
    const teamEmployeeIds = new Set<string>()
    for (const team of taskTeams) {
      for (const m of team.members) {
        teamEmployeeIds.add(m.employeeId)
      }
    }

    // 3. Watchlist employees
    const watchlistEntries = await prisma.mDWatchlistEmployee.findMany({
      where: { ownerId: user.id },
      include: {
        employee: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
            department: { select: { id: true, name: true } },
          },
        },
      },
    })

    type EmployeeRow = {
      id: string
      userId?: string
      user: { id: string; name: string | null; email: string | null; role: string }
      department: { id: string; name: string } | null
      designation?: string | null
    }

    // Merge and deduplicate by employee id; track source (subordinate > team > watchlist)
    const byEmployeeId = new Map<string, { employee: EmployeeRow; source: TeamMemberSource }>()
    for (const emp of subordinateEmployees) {
      byEmployeeId.set(emp.id, { employee: emp as EmployeeRow, source: "subordinate" })
    }
    for (const team of taskTeams) {
      for (const m of team.members) {
        const e = m.employee as EmployeeRow
        if (!byEmployeeId.has(e.id)) {
          byEmployeeId.set(e.id, { employee: e, source: "team" })
        }
      }
    }
    for (const entry of watchlistEntries) {
      const e = entry.employee as EmployeeRow
      if (!byEmployeeId.has(e.id)) {
        byEmployeeId.set(e.id, { employee: e, source: "watchlist" })
      }
    }

    const employeeIds = Array.from(byEmployeeId.keys())

    if (employeeIds.length === 0) {
      return successResponse({ members: [] })
    }

    // Designations (subordinates don't have it in hierarchy select)
    const employeesWithMeta = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, userId: true, designation: true },
    })
    const designationByEmployeeId = new Map(employeesWithMeta.map((e) => [e.id, e.designation ?? null]))

    // Task counts per assignee (userId)
    const userIds = Array.from(byEmployeeId.values()).map((v) =>
      v.employee.userId ?? v.employee.user.id
    )
    const tasksByAssignee = await prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { in: userIds },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      _count: { id: true },
    })
    const overdueByAssignee = await prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        assigneeId: { in: userIds },
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: today },
      },
      _count: { id: true },
    })
    const taskCountMap = new Map<string, number>()
    const overdueCountMap = new Map<string, number>()
    for (const r of tasksByAssignee) {
      taskCountMap.set(r.assigneeId, r._count.id)
    }
    for (const r of overdueByAssignee) {
      overdueCountMap.set(r.assigneeId, r._count.id)
    }

    // Today's attendance
    const todayAttendance = await prisma.attendanceLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        logDate: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { logDate: "asc" },
    })
    const todayLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
    })

    const attendanceByEmployeeId = new Map<string, { status: AttendanceStatus; inTime: string | null }>()
    for (const empId of employeeIds) {
      const onLeave = todayLeaves.some((l) => l.employeeId === empId)
      if (onLeave) {
        attendanceByEmployeeId.set(empId, { status: "leave", inTime: null })
        continue
      }
      const firstPunch = todayAttendance.find((a) => a.employeeId === empId)
      if (firstPunch) {
        attendanceByEmployeeId.set(empId, {
          status: "in",
          inTime: firstPunch.logDate.toISOString(),
        })
      } else {
        attendanceByEmployeeId.set(empId, { status: "out", inTime: null })
      }
    }

    const members: MDTeamOverviewMember[] = []
    for (const [empId, { employee, source }] of byEmployeeId) {
      const u = employee.user
      const userId = employee.userId ?? u.id
      const name = u.name ?? ""
      const email = u.email ?? ""
      if (search && !name.toLowerCase().includes(search) && !email.toLowerCase().includes(search)) {
        continue
      }
      const att = attendanceByEmployeeId.get(empId) ?? { status: "out" as AttendanceStatus, inTime: null }
      members.push({
        id: userId,
        employeeId: empId,
        name,
        email,
        role: u.role ?? "",
        designation: designationByEmployeeId.get(empId) ?? null,
        department: employee.department,
        taskCount: taskCountMap.get(userId) ?? 0,
        overdueCount: overdueCountMap.get(userId) ?? 0,
        attendanceStatus: att.status,
        inTime: att.inTime,
        source,
      })
    }

    // Sort by name
    members.sort((a, b) => a.name.localeCompare(b.name))

    return successResponse({ members })
  } catch (err) {
    console.error("Error fetching MD team overview:", err)
    return errorResponse("Failed to fetch team overview", 500)
  }
}
