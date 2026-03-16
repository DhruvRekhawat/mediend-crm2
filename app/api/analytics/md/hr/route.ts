import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

const SLA_HOURS = 48

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'MD' && user.role !== 'ADMIN' && user.role !== 'HR_HEAD') {
      return errorResponse(`Forbidden: Access denied for role ${user.role}.`, 403)
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    const now = new Date()
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // All employees (not just BD)
    const allEmployees = await prisma.employee.findMany({
      include: {
        user: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    })

    const totalHeadcount = allEmployees.length
    const employeeIds = allEmployees.map((e) => e.id)

    // Today's strength: distinct employees who punched IN today
    const todayPunches = await prisma.attendanceLog.findMany({
      where: {
        employeeId: { in: employeeIds },
        logDate: { gte: todayStart, lte: todayEnd },
        punchDirection: 'IN',
      },
      select: { employeeId: true },
      distinct: ['employeeId'],
    })
    const todayStrength = todayPunches.length

    // Pending leave requests (not month-filtered)
    const pendingLeaveCount = await prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    })

    // MonthlyPayroll for selected month - salary by department and team
    const payrolls = await prisma.monthlyPayroll.findMany({
      where: {
        employeeId: { in: employeeIds },
        month,
        year,
      },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
      },
    })

    const payrollByDept = new Map<string, number>()
    const payrollByTeam = new Map<string, number>()
    let totalMonthlySalary = 0

    payrolls.forEach((p) => {
      totalMonthlySalary += p.netPayable
      const deptName = p.employee.department?.name || 'No Department'
      const teamName = p.employee.team?.name || 'No Team'
      payrollByDept.set(deptName, (payrollByDept.get(deptName) || 0) + p.netPayable)
      payrollByTeam.set(teamName, (payrollByTeam.get(teamName) || 0) + p.netPayable)
    })

    // Fallback: SalaryStructure when no payroll
    if (payrolls.length === 0) {
      const structures = await prisma.salaryStructure.findMany({
        where: {
          employeeId: { in: employeeIds },
          effectiveFrom: { lte: monthEnd },
          OR: [
            { effectiveTo: { equals: null } },
            { effectiveTo: { gte: monthStart } },
          ],
        },
        include: {
          employee: {
            include: {
              department: { select: { name: true } },
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      })

      // Dedupe by employee (take latest)
      const seen = new Set<string>()
      structures.forEach((s) => {
        if (seen.has(s.employeeId)) return
        seen.add(s.employeeId)
        const monthly = s.annualCtc / 12
        totalMonthlySalary += monthly
        const deptName = s.employee.department?.name || 'No Department'
        const teamName = s.employee.team?.name || 'No Team'
        payrollByDept.set(deptName, (payrollByDept.get(deptName) || 0) + monthly)
        payrollByTeam.set(teamName, (payrollByTeam.get(teamName) || 0) + monthly)
      })
    }

    const departmentSalaryBreakdown = Array.from(payrollByDept.entries())
      .map(([name, amount]) => ({ departmentName: name, amount }))
      .sort((a, b) => b.amount - a.amount)

    const teamSalaryBreakdown = Array.from(payrollByTeam.entries())
      .map(([name, amount]) => ({ teamName: name, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Department-wise headcount
    const headcountByDept = new Map<string, number>()
    allEmployees.forEach((e) => {
      const deptName = e.department?.name || 'No Department'
      headcountByDept.set(deptName, (headcountByDept.get(deptName) || 0) + 1)
    })
    const departmentHeadcount = Array.from(headcountByDept.entries())
      .map(([name, count]) => ({ departmentName: name, count }))
      .sort((a, b) => b.count - a.count)

    // SupportTicket stats for the month
    const supportTickets = await prisma.supportTicket.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        status: true,
        targetHeadRole: true,
        createdAt: true,
        respondedAt: true,
      },
    })

    const openSupportTickets = await prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    })

    const resolvedSupportTickets = supportTickets.filter(
      (t) => t.respondedAt != null
    )
    const supportResponseTimes = resolvedSupportTickets
      .map((t) => (t.respondedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60))
      .filter((h) => h >= 0)
    const avgSupportResponseHours =
      supportResponseTimes.length > 0
        ? supportResponseTimes.reduce((a, b) => a + b, 0) / supportResponseTimes.length
        : null
    const supportSlaCompliant = resolvedSupportTickets.filter(
      (t) => t.respondedAt && (t.respondedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60) <= SLA_HOURS
    ).length
    const supportSlaPercent =
      resolvedSupportTickets.length > 0
        ? (supportSlaCompliant / resolvedSupportTickets.length) * 100
        : null

    // MentalHealthRequest stats for the month
    const mentalHealthRequests = await prisma.mentalHealthRequest.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        respondedAt: true,
      },
    })

    const pendingMentalHealth = await prisma.mentalHealthRequest.count({
      where: { status: 'PENDING' },
    })

    const resolvedMentalHealth = mentalHealthRequests.filter(
      (r) => r.respondedAt != null
    )
    const mentalHealthResponseTimes = resolvedMentalHealth
      .map((r) => (r.respondedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60))
      .filter((h) => h >= 0)
    const avgMentalHealthResponseHours =
      mentalHealthResponseTimes.length > 0
        ? mentalHealthResponseTimes.reduce((a, b) => a + b, 0) / mentalHealthResponseTimes.length
        : null
    const mentalHealthSlaCompliant = resolvedMentalHealth.filter(
      (r) => r.respondedAt && (r.respondedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) <= SLA_HOURS
    ).length
    const mentalHealthSlaPercent =
      resolvedMentalHealth.length > 0
        ? (mentalHealthSlaCompliant / resolvedMentalHealth.length) * 100
        : null

    // MDAppointment stats for the month
    const mdAppointments = await prisma.mDAppointment.findMany({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    })

    const openTicketsCount = openSupportTickets + pendingMentalHealth

    // Combined avg response time (SupportTicket + MentalHealthRequest)
    const allResponseTimes = [...supportResponseTimes, ...mentalHealthResponseTimes]
    const avgTicketResponseHours =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
        : null

    const ticketAnalytics = [
      {
        type: 'Support Tickets',
        targetRole: 'HR_HEAD',
        totalInMonth: supportTickets.length,
        resolvedCount: resolvedSupportTickets.length,
        avgResponseHours: avgSupportResponseHours,
        slaCompliancePercent: supportSlaPercent,
      },
      {
        type: 'Mental Health',
        targetRole: null,
        totalInMonth: mentalHealthRequests.length,
        resolvedCount: resolvedMentalHealth.length,
        avgResponseHours: avgMentalHealthResponseHours,
        slaCompliancePercent: mentalHealthSlaPercent,
      },
      {
        type: 'MD Appointments',
        targetRole: null,
        totalInMonth: mdAppointments.length,
        resolvedCount: mdAppointments.filter((a) => a.status !== 'PENDING').length,
        avgResponseHours: null,
        slaCompliancePercent: null,
      },
    ]

    return successResponse({
      kpis: {
        todayStrength: todayStrength,
        totalHeadcount: totalHeadcount,
        monthlySalaryOutgo: totalMonthlySalary,
        openTicketsCount: openTicketsCount,
        avgTicketResponseHours: avgTicketResponseHours,
        pendingLeaveCount: pendingLeaveCount,
        hasPayrollData: payrolls.length > 0,
      },
      departmentSalaryBreakdown,
      teamSalaryBreakdown,
      departmentHeadcount,
      ticketAnalytics,
      month,
      year,
    })
  } catch (error) {
    console.error('Error fetching HR analytics:', error)
    return errorResponse('Failed to fetch HR analytics', 500)
  }
}
