import type { HRAnalytics } from '@/components/hr/hr-dashboard'

export function generateHRDemoData(): HRAnalytics {
  const departments = ['Sales', 'Operations', 'Marketing', 'Support', 'Finance']
  const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Echo']

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const totalHeadcount = 45
  const todayStrength = Math.floor(totalHeadcount * (0.85 + Math.random() * 0.12))

  const departmentSalaryBreakdown = departments.map((departmentName) => ({
    departmentName,
    amount: Math.floor(Math.random() * 800000) + 200000,
  })).sort((a, b) => b.amount - a.amount)

  const teamSalaryBreakdown = teams.map((teamName) => ({
    teamName,
    amount: Math.floor(Math.random() * 400000) + 100000,
  })).sort((a, b) => b.amount - a.amount)

  const counts = [12, 10, 9, 8, 6]
  const departmentHeadcount = departments.map((departmentName, i) => ({
    departmentName,
    count: counts[i] ?? Math.floor(totalHeadcount / departments.length),
  })).sort((a, b) => b.count - a.count)

  const monthlySalaryOutgo = departmentSalaryBreakdown.reduce((sum, d) => sum + d.amount, 0)

  return {
    kpis: {
      todayStrength,
      totalHeadcount,
      monthlySalaryOutgo,
      openTicketsCount: Math.floor(Math.random() * 8) + 1,
      avgTicketResponseHours: 12 + Math.random() * 20,
      pendingLeaveCount: Math.floor(Math.random() * 5),
      hasPayrollData: true,
    },
    departmentSalaryBreakdown,
    teamSalaryBreakdown,
    departmentHeadcount,
    ticketAnalytics: [
      {
        type: 'Support Tickets',
        targetRole: 'HR_HEAD',
        totalInMonth: Math.floor(Math.random() * 15) + 5,
        resolvedCount: Math.floor(Math.random() * 12) + 3,
        avgResponseHours: 18 + Math.random() * 15,
        slaCompliancePercent: 75 + Math.random() * 25,
      },
      {
        type: 'Mental Health',
        targetRole: null,
        totalInMonth: Math.floor(Math.random() * 5) + 1,
        resolvedCount: Math.floor(Math.random() * 4) + 1,
        avgResponseHours: 24 + Math.random() * 20,
        slaCompliancePercent: 80 + Math.random() * 20,
      },
      {
        type: 'MD Appointments',
        targetRole: null,
        totalInMonth: Math.floor(Math.random() * 8) + 2,
        resolvedCount: Math.floor(Math.random() * 6) + 2,
        avgResponseHours: null,
        slaCompliancePercent: null,
      },
    ],
    month,
    year,
  }
}
