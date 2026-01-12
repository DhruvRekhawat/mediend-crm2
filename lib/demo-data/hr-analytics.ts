import { HRAnalytics } from '@/app/md/hr/page'

export function generateHRDemoData(): HRAnalytics {
  const bdNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Anjali Desai', 'Rohit Mehta', 'Kavita Nair', 'Arjun Verma', 'Meera Joshi']
  const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']
  const departments = ['Sales', 'Operations', 'Marketing', 'Support']
  const leaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Personal Leave', 'Maternity Leave']

  // Generate BD performance
  const bdPerformance = bdNames.map((bdName, index) => ({
    bdId: `bd-${index}`,
    bdName,
    employeeCode: `EMP${String(index + 1).padStart(4, '0')}`,
    teamName: teams[Math.floor(Math.random() * teams.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    revenue: Math.floor(Math.random() * 2000000) + 500000,
    profit: Math.floor(Math.random() * 800000) + 200000,
    closedLeads: Math.floor(Math.random() * 40) + 15,
    totalLeads: Math.floor(Math.random() * 60) + 25,
    conversionRate: 0,
    targetAchievement: Math.random() * 40 + 60, // 60-100%
    targetMetric: 'LEADS_CLOSED',
  })).map((bd) => ({
    ...bd,
    conversionRate: bd.totalLeads > 0 ? (bd.closedLeads / bd.totalLeads) * 100 : 0,
  })).sort((a, b) => b.profit - a.profit)

  // Generate team performance
  const teamPerformance = teams.map((teamName) => {
    const teamBds = bdPerformance.filter((bd) => bd.teamName === teamName)
    return {
      teamName,
      revenue: teamBds.reduce((sum, bd) => sum + bd.revenue, 0),
      profit: teamBds.reduce((sum, bd) => sum + bd.profit, 0),
      closedLeads: teamBds.reduce((sum, bd) => sum + bd.closedLeads, 0),
      totalLeads: teamBds.reduce((sum, bd) => sum + bd.totalLeads, 0),
      conversionRate: 0,
      bdCount: teamBds.length,
    }
  }).map((team) => ({
    ...team,
    conversionRate: team.totalLeads > 0 ? (team.closedLeads / team.totalLeads) * 100 : 0,
  })).sort((a, b) => b.profit - a.profit)

  // Generate attendance data
  const employeeAttendance = bdNames.map((employeeName, index) => {
    const totalPunches = Math.floor(Math.random() * 20) + 15
    const lateArrivals = Math.floor(totalPunches * (Math.random() * 0.3))
    return {
      employeeId: `emp-${index}`,
      employeeName,
      employeeCode: `EMP${String(index + 1).padStart(4, '0')}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      totalPunches,
      lateArrivals,
      onTimePunches: totalPunches - lateArrivals,
      attendanceRate: ((totalPunches - lateArrivals) / totalPunches) * 100,
      lateArrivalRate: (lateArrivals / totalPunches) * 100,
    }
  }).sort((a, b) => b.lateArrivals - a.lateArrivals)

  // Generate daily attendance trend
  const dailyTrend: Array<{ date: string; total: number; late: number; onTime: number; attendanceRate: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const total = Math.floor(Math.random() * 5) + 8
    const late = Math.floor(total * (Math.random() * 0.2))
    dailyTrend.push({
      date: date.toISOString().split('T')[0],
      total,
      late,
      onTime: total - late,
      attendanceRate: ((total - late) / total) * 100,
    })
  }

  // Generate department attendance
  const departmentAttendance = departments.map((departmentName) => {
    const deptEmployees = employeeAttendance.filter((e) => e.department === departmentName)
    return {
      departmentName,
      totalEmployees: deptEmployees.length,
      totalPunches: deptEmployees.reduce((sum, e) => sum + e.totalPunches, 0),
      latePunches: deptEmployees.reduce((sum, e) => sum + e.lateArrivals, 0),
      attendanceRate: 0,
    }
  }).map((d) => ({
    ...d,
    attendanceRate: d.totalPunches > 0 ? ((d.totalPunches - d.latePunches) / d.totalPunches) * 100 : 0,
  }))

  // Generate leave trends
  const leaveTrends: Array<{ date: string; days: number; requests: number }> = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    leaveTrends.push({
      date: date.toISOString().split('T')[0],
      days: Math.floor(Math.random() * 5) + 1,
      requests: Math.floor(Math.random() * 3) + 1,
    })
  }

  const totalLeaves = leaveTrends.reduce((sum, t) => sum + t.days, 0)
  const totalLeaveRequests = leaveTrends.reduce((sum, t) => sum + t.requests, 0)

  // Generate high leave employees
  const highLeaveEmployees = bdNames.slice(0, 5).map((employeeName, index) => ({
    employeeId: `emp-${index}`,
    employeeName,
    employeeCode: `EMP${String(index + 1).padStart(4, '0')}`,
    department: departments[Math.floor(Math.random() * departments.length)],
    totalLeaves: Math.floor(Math.random() * 10) + 5,
    leaveRequests: Math.floor(Math.random() * 5) + 2,
  })).sort((a, b) => b.totalLeaves - a.totalLeaves)

  // Generate leave type distribution
  const leaveTypeDistribution = leaveTypes.map((leaveType) => ({
    leaveType,
    days: Math.floor(Math.random() * 20) + 5,
    requests: Math.floor(Math.random() * 10) + 2,
  }))

  const overallAttendanceRate = employeeAttendance.reduce((sum, e) => sum + e.attendanceRate, 0) / employeeAttendance.length
  const totalLateArrivals = employeeAttendance.reduce((sum, e) => sum + e.lateArrivals, 0)
  const totalPunches = employeeAttendance.reduce((sum, e) => sum + e.totalPunches, 0)

  return {
    kpis: {
      bdCount: bdNames.length,
      activeTeamsCount: teams.length,
      overallAttendanceRate,
      totalLeaves,
      totalLeaveRequests,
      avgLeavesPerEmployee: totalLeaves / bdNames.length,
      lateArrivalsCount: totalLateArrivals,
      lateArrivalRate: totalPunches > 0 ? (totalLateArrivals / totalPunches) * 100 : 0,
    },
    bdPerformance,
    teamPerformance,
    attendance: {
      overallRate: overallAttendanceRate,
      lateArrivalsCount: totalLateArrivals,
      lateArrivalRate: totalPunches > 0 ? (totalLateArrivals / totalPunches) * 100 : 0,
      employeeAttendance,
      dailyTrend,
      departmentAttendance,
    },
    leaves: {
      totalLeaves,
      totalRequests: totalLeaveRequests,
      leaveTrends,
      highLeaveEmployees,
      leaveTypeDistribution,
    },
  }
}
