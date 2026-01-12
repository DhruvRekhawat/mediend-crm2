import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, PipelineStage } from '@prisma/client'
import { getSession } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD and ADMIN can access
    if (user.role !== 'MD' && user.role !== 'ADMIN') {
      console.log('MD HR API: Access denied for role:', user.role)
      return errorResponse(`Forbidden: Access denied for role ${user.role}. Only MD and ADMIN can access.`, 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // BD Performance Metrics
    const completedWhere: Prisma.LeadWhereInput = {
      pipelineStage: PipelineStage.COMPLETED,
      ...(Object.keys(dateFilter).length > 0 && {
        OR: [
          { conversionDate: dateFilter },
          {
            AND: [
              { conversionDate: { equals: null } },
              { createdDate: dateFilter }
            ]
          },
        ],
      }),
    }

    const allLeadsWhere: Prisma.LeadWhereInput = {
      ...(Object.keys(dateFilter).length > 0 && { createdDate: dateFilter }),
    }

    const bdStats = await prisma.lead.groupBy({
      by: ['bdId'],
      where: completedWhere,
      _count: { id: true },
      _sum: {
        billAmount: true,
        netProfit: true,
      },
    })

    const bdLeads = await prisma.lead.groupBy({
      by: ['bdId'],
      where: allLeadsWhere,
      _count: { id: true },
    })

    const bdMap = new Map(bdLeads.map((b) => [b.bdId, b._count.id]))
    const bdIds = [...new Set(bdStats.map((b) => b.bdId))]
    const bds = await prisma.user.findMany({
      where: { id: { in: bdIds }, role: 'BD' },
      include: {
        team: { select: { id: true, name: true } },
        employee: {
          select: {
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    })

    // Get targets for BDs
    const targets = await prisma.target.findMany({
      where: {
        targetType: 'BD',
        targetForId: { in: bdIds },
        periodStartDate: { lte: endDate ? new Date(endDate) : new Date() },
        periodEndDate: { gte: startDate ? new Date(startDate) : new Date() },
      },
      select: {
        targetForId: true,
        metric: true,
        targetValue: true,
      },
    })

    const targetMap = new Map<string, { metric: string; targetValue: number }>()
    targets.forEach((t) => {
      if (!targetMap.has(t.targetForId)) {
        targetMap.set(t.targetForId, { metric: t.metric, targetValue: t.targetValue })
      }
    })

    const bdPerformance = bdStats.map((stat) => {
      const bd = bds.find((b) => b.id === stat.bdId)
      const totalBdLeads = bdMap.get(stat.bdId) || 0
      const closedLeads = stat._count.id
      const target = targetMap.get(stat.bdId)
      let targetAchievement = 0
      if (target) {
        if (target.metric === 'LEADS_CLOSED') {
          targetAchievement = target.targetValue > 0 ? (closedLeads / target.targetValue) * 100 : 0
        } else if (target.metric === 'NET_PROFIT') {
          targetAchievement = target.targetValue > 0 ? ((stat._sum.netProfit || 0) / target.targetValue) * 100 : 0
        }
      }
      return {
        bdId: stat.bdId,
        bdName: bd?.name || 'Unknown',
        employeeCode: bd?.employee?.employeeCode || 'N/A',
        teamName: bd?.team?.name || 'No Team',
        department: bd?.employee?.department?.name || 'N/A',
        revenue: stat._sum.billAmount || 0,
        profit: stat._sum.netProfit || 0,
        closedLeads,
        totalLeads: totalBdLeads,
        conversionRate: totalBdLeads > 0 ? (closedLeads / totalBdLeads) * 100 : 0,
        targetAchievement: Math.min(targetAchievement, 100),
        targetMetric: target?.metric || null,
      }
    })
    bdPerformance.sort((a, b) => b.profit - a.profit)

    // Team Performance
    const teamMap = new Map<
      string,
      {
        name: string
        revenue: number
        profit: number
        closedLeads: number
        totalLeads: number
        bdCount: number
      }
    >()
    bdPerformance.forEach((bd) => {
      const bdUser = bds.find((b) => b.id === bd.bdId)
      if (bdUser?.team) {
        const existing = teamMap.get(bdUser.team.id) || {
          name: bdUser.team.name,
          revenue: 0,
          profit: 0,
          closedLeads: 0,
          totalLeads: 0,
          bdCount: 0,
        }
        existing.revenue += bd.revenue
        existing.profit += bd.profit
        existing.closedLeads += bd.closedLeads
        existing.totalLeads += bd.totalLeads
        existing.bdCount += 1
        teamMap.set(bdUser.team.id, existing)
      }
    })

    const teamPerformance = Array.from(teamMap.values())
      .map((team) => ({
        teamName: team.name,
        revenue: team.revenue,
        profit: team.profit,
        closedLeads: team.closedLeads,
        totalLeads: team.totalLeads,
        conversionRate: team.totalLeads > 0 ? (team.closedLeads / team.totalLeads) * 100 : 0,
        bdCount: team.bdCount,
      }))
      .sort((a, b) => b.profit - a.profit)

    // Attendance Analytics
    const attendanceDateFilter: Prisma.DateTimeFilter = {}
    if (startDate) attendanceDateFilter.gte = new Date(startDate)
    if (endDate) attendanceDateFilter.lte = new Date(endDate)

    // Get all BD employees
    const bdEmployees = await prisma.employee.findMany({
      where: {
        user: {
          role: 'BD',
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        department: { select: { name: true } },
      },
    })

    const employeeIds = bdEmployees.map((e) => e.id)

    // Get attendance logs
    const attendanceLogs = await prisma.attendanceLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(attendanceDateFilter).length > 0 && { logDate: attendanceDateFilter }),
        punchDirection: 'IN',
      },
      orderBy: { logDate: 'asc' },
    })

    // Calculate late arrivals (assuming 9:00 AM as standard time)
    const standardTime = 9 // 9 AM
    const lateArrivals = attendanceLogs.filter((log) => {
      const hour = log.logDate.getHours()
      return hour > standardTime || (hour === standardTime && log.logDate.getMinutes() > 0)
    })

    // Group by employee
    const employeeAttendanceMap = new Map<
      string,
      {
        employeeId: string
        employeeName: string
        employeeCode: string
        department: string
        totalPunches: number
        lateArrivals: number
        onTimePunches: number
      }
    >()

    attendanceLogs.forEach((log) => {
      const employee = bdEmployees.find((e) => e.id === log.employeeId)
      if (!employee) return

      const existing = employeeAttendanceMap.get(log.employeeId) || {
        employeeId: log.employeeId,
        employeeName: employee.user.name,
        employeeCode: employee.employeeCode,
        department: employee.department?.name || 'N/A',
        totalPunches: 0,
        lateArrivals: 0,
        onTimePunches: 0,
      }
      existing.totalPunches += 1
      const hour = log.logDate.getHours()
      if (hour > standardTime || (hour === standardTime && log.logDate.getMinutes() > 0)) {
        existing.lateArrivals += 1
      } else {
        existing.onTimePunches += 1
      }
      employeeAttendanceMap.set(log.employeeId, existing)
    })

    const employeeAttendance = Array.from(employeeAttendanceMap.values())
      .map((e) => ({
        ...e,
        attendanceRate: e.totalPunches > 0 ? (e.onTimePunches / e.totalPunches) * 100 : 0,
        lateArrivalRate: e.totalPunches > 0 ? (e.lateArrivals / e.totalPunches) * 100 : 0,
      }))
      .sort((a, b) => b.lateArrivals - a.lateArrivals)

    // Daily attendance trend
    const dailyAttendance = await prisma.attendanceLog.groupBy({
      by: ['logDate'],
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(attendanceDateFilter).length > 0 && { logDate: attendanceDateFilter }),
        punchDirection: 'IN',
      },
      _count: true,
    })

    const dailyTrendMap = new Map<string, { date: string; total: number; late: number }>()
    dailyAttendance.forEach((day) => {
      const dateKey = day.logDate.toISOString().split('T')[0]
      dailyTrendMap.set(dateKey, {
        date: dateKey,
        total: day._count,
        late: 0,
      })
    })

    lateArrivals.forEach((log) => {
      const dateKey = log.logDate.toISOString().split('T')[0]
      const existing = dailyTrendMap.get(dateKey)
      if (existing) {
        existing.late += 1
        dailyTrendMap.set(dateKey, existing)
      }
    })

    const dailyAttendanceTrend = Array.from(dailyTrendMap.values())
      .map((d) => ({
        ...d,
        onTime: d.total - d.late,
        attendanceRate: d.total > 0 ? ((d.total - d.late) / d.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Department-wise attendance
    const departmentAttendance = await prisma.attendanceLog.groupBy({
      by: ['employeeId'],
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(attendanceDateFilter).length > 0 && { logDate: attendanceDateFilter }),
        punchDirection: 'IN',
      },
      _count: true,
    })

    const deptMap = new Map<
      string,
      {
        departmentName: string
        totalEmployees: number
        totalPunches: number
        latePunches: number
      }
    >()

    departmentAttendance.forEach((stat) => {
      const employee = bdEmployees.find((e) => e.id === stat.employeeId)
      const deptName = employee?.department?.name || 'N/A'
      const existing = deptMap.get(deptName) || {
        departmentName: deptName,
        totalEmployees: 0,
        totalPunches: 0,
        latePunches: 0,
      }
      existing.totalPunches += stat._count
      existing.totalEmployees += 1
      deptMap.set(deptName, existing)
    })

    // Count late punches by department
    lateArrivals.forEach((log) => {
      const employee = bdEmployees.find((e) => e.id === log.employeeId)
      const deptName = employee?.department?.name || 'N/A'
      const existing = deptMap.get(deptName)
      if (existing) {
        existing.latePunches += 1
        deptMap.set(deptName, existing)
      }
    })

    const departmentAttendanceData = Array.from(deptMap.values()).map((d) => ({
      ...d,
      attendanceRate: d.totalPunches > 0 ? ((d.totalPunches - d.latePunches) / d.totalPunches) * 100 : 0,
    }))

    // Leave Analytics
    const leaveDateFilter: Prisma.DateTimeFilter = {}
    if (startDate) leaveDateFilter.gte = new Date(startDate)
    if (endDate) leaveDateFilter.lte = new Date(endDate)

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(leaveDateFilter).length > 0 && { startDate: leaveDateFilter }),
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
    })

    const leaveStats = leaveRequests.reduce(
      (acc, leave) => {
        acc.totalLeaves += leave.days
        acc.totalRequests += 1
        return acc
      },
      { totalLeaves: 0, totalRequests: 0 }
    )

    // Leave trends
    const leaveTrends = await prisma.leaveRequest.groupBy({
      by: ['startDate'],
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(leaveDateFilter).length > 0 && { startDate: leaveDateFilter }),
      },
      _sum: { days: true },
      _count: true,
    })

    const leaveTrendsData = leaveTrends
      .map((l) => ({
        date: l.startDate.toISOString().split('T')[0],
        days: l._sum.days || 0,
        requests: l._count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Employees with high leave rates
    const employeeLeaveMap = new Map<
      string,
      {
        employeeId: string
        employeeName: string
        employeeCode: string
        department: string
        totalLeaves: number
        leaveRequests: number
      }
    >()

    leaveRequests.forEach((leave) => {
      const existing = employeeLeaveMap.get(leave.employeeId) || {
        employeeId: leave.employeeId,
        employeeName: leave.employee.user.name,
        employeeCode: leave.employee.employeeCode,
        department: leave.employee.department?.name || 'N/A',
        totalLeaves: 0,
        leaveRequests: 0,
      }
      existing.totalLeaves += leave.days
      existing.leaveRequests += 1
      employeeLeaveMap.set(leave.employeeId, existing)
    })

    const highLeaveEmployees = Array.from(employeeLeaveMap.values())
      .sort((a, b) => b.totalLeaves - a.totalLeaves)
      .slice(0, 20)

    // Leave type distribution
    const leaveTypeStats = await prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: {
        employeeId: { in: employeeIds },
        ...(Object.keys(leaveDateFilter).length > 0 && { startDate: leaveDateFilter }),
      },
      _sum: { days: true },
      _count: true,
    })

    const leaveTypeIds = leaveTypeStats.map((l) => l.leaveTypeId)
    const leaveTypes = await prisma.leaveTypeMaster.findMany({
      where: { id: { in: leaveTypeIds } },
      select: { id: true, name: true },
    })

    const leaveTypeMap = new Map(leaveTypes.map((lt) => [lt.id, lt.name]))
    const leaveTypeDistribution = leaveTypeStats.map((stat) => ({
      leaveType: leaveTypeMap.get(stat.leaveTypeId) || 'Unknown',
      days: stat._sum.days || 0,
      requests: stat._count,
    }))

    // Overall attendance rate
    const totalExpectedPunches = employeeIds.length * (dateFilter.gte && dateFilter.lte
      ? Math.ceil((new Date(dateFilter.lte).getTime() - new Date(dateFilter.gte).getTime()) / (1000 * 60 * 60 * 24))
      : 30)
    const totalActualPunches = attendanceLogs.length
    const overallAttendanceRate = totalExpectedPunches > 0 ? (totalActualPunches / totalExpectedPunches) * 100 : 0

    // BD Count and Active Teams
    const bdCount = await prisma.user.count({
      where: { role: 'BD' },
    })

    const activeTeams = await prisma.team.findMany({
      include: {
        members: {
          where: { role: 'BD' },
        },
      },
    })

    const activeTeamsCount = activeTeams.filter((t) => t.members.length > 0).length

    return successResponse({
      kpis: {
        bdCount,
        activeTeamsCount,
        overallAttendanceRate: Math.min(overallAttendanceRate, 100),
        totalLeaves: leaveStats.totalLeaves,
        totalLeaveRequests: leaveStats.totalRequests,
        avgLeavesPerEmployee: bdCount > 0 ? leaveStats.totalLeaves / bdCount : 0,
        lateArrivalsCount: lateArrivals.length,
        lateArrivalRate: attendanceLogs.length > 0 ? (lateArrivals.length / attendanceLogs.length) * 100 : 0,
      },
      bdPerformance,
      teamPerformance,
      attendance: {
        overallRate: overallAttendanceRate,
        lateArrivalsCount: lateArrivals.length,
        lateArrivalRate: attendanceLogs.length > 0 ? (lateArrivals.length / attendanceLogs.length) * 100 : 0,
        employeeAttendance,
        dailyTrend: dailyAttendanceTrend,
        departmentAttendance: departmentAttendanceData,
      },
      leaves: {
        totalLeaves: leaveStats.totalLeaves,
        totalRequests: leaveStats.totalRequests,
        leaveTrends: leaveTrendsData,
        highLeaveEmployees,
        leaveTypeDistribution,
      },
    })
  } catch (error) {
    console.error('Error fetching MD HR analytics:', error)
    return errorResponse('Failed to fetch HR analytics', 500)
  }
}
