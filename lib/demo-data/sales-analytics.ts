import { SalesAnalytics } from '@/app/md/sales/page'

export function generateSalesDemoData(): SalesAnalytics {
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat']
  const diseases = ['Knee Replacement', 'Hip Replacement', 'Cardiac Surgery', 'Spine Surgery', 'Cataract', 'Dental Implant', 'Cosmetic Surgery', 'Orthopedic']
  const hospitals = ['Apollo Hospital', 'Fortis Healthcare', 'Max Hospital', 'AIIMS', 'Manipal Hospital', 'Narayana Health', 'Medanta', 'BLK Hospital']
  const paymentModes = ['Cash', 'Cashless', 'UPI', 'Card', 'Cheque']
  const circles = ['North', 'South', 'East', 'West', 'Central']
  const statuses = ['New', 'Hot Lead', 'Interested', 'Follow-up (1-3)', 'IPD Done', 'Closed', 'Lost', 'DNP']

  // Generate date range for trends (last 30 days)
  const trends: Array<{ date: string; revenue: number; profit: number; surgeries: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    trends.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 500000) + 100000,
      profit: Math.floor(Math.random() * 200000) + 50000,
      surgeries: Math.floor(Math.random() * 15) + 5,
    })
  }

  // Calculate totals from trends
  const totalRevenue = trends.reduce((sum, t) => sum + t.revenue, 0)
  const totalProfit = trends.reduce((sum, t) => sum + t.profit, 0)
  const totalSurgeries = trends.reduce((sum, t) => sum + t.surgeries, 0)
  const totalLeads = Math.floor(totalSurgeries * 1.5) // Assume 66% conversion rate
  const avgTicketSize = totalRevenue / totalSurgeries
  const avgNetProfit = totalProfit / totalSurgeries

  // Generate city performance
  const cityPerformance = cities.map((city, index) => ({
    city,
    revenue: Math.floor(Math.random() * 2000000) + 500000,
    profit: Math.floor(Math.random() * 800000) + 200000,
    surgeries: Math.floor(Math.random() * 50) + 10,
    leads: Math.floor(Math.random() * 80) + 20,
    conversionRate: Math.random() * 30 + 50, // 50-80%
    avgTicketSize: Math.floor(Math.random() * 50000) + 50000,
  })).sort((a, b) => b.revenue - a.revenue)

  // Generate disease performance
  const diseasePerformance = diseases.map((disease) => ({
    disease,
    count: Math.floor(Math.random() * 30) + 5,
    revenue: Math.floor(Math.random() * 1500000) + 300000,
    profit: Math.floor(Math.random() * 600000) + 150000,
  })).sort((a, b) => b.revenue - a.revenue)

  // Generate hospital performance
  const hospitalPerformance = hospitals.map((hospital) => ({
    hospital,
    surgeries: Math.floor(Math.random() * 40) + 10,
    revenue: Math.floor(Math.random() * 3000000) + 500000,
    profit: Math.floor(Math.random() * 1200000) + 200000,
  })).sort((a, b) => b.revenue - a.revenue)

  // Generate payment mode analysis
  const paymentModeAnalysis = paymentModes.map((mode) => ({
    mode,
    count: Math.floor(Math.random() * 100) + 20,
    revenue: Math.floor(Math.random() * 2000000) + 500000,
    profit: Math.floor(Math.random() * 800000) + 200000,
  }))

  // Generate BD performance
  const bdNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Anjali Desai', 'Rohit Mehta', 'Kavita Nair']
  const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']
  const bdPerformance = bdNames.map((bdName, index) => ({
    bdId: `bd-${index}`,
    bdName,
    teamName: teams[Math.floor(Math.random() * teams.length)],
    revenue: Math.floor(Math.random() * 1500000) + 300000,
    profit: Math.floor(Math.random() * 600000) + 150000,
    closedLeads: Math.floor(Math.random() * 30) + 10,
    totalLeads: Math.floor(Math.random() * 50) + 20,
    conversionRate: Math.random() * 30 + 50,
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
    }
  }).map((team) => ({
    ...team,
    conversionRate: team.totalLeads > 0 ? (team.closedLeads / team.totalLeads) * 100 : 0,
  })).sort((a, b) => b.profit - a.profit)

  // Generate circle performance
  const circlePerformance = circles.map((circle) => ({
    circle,
    revenue: Math.floor(Math.random() * 5000000) + 1000000,
    profit: Math.floor(Math.random() * 2000000) + 400000,
    surgeries: Math.floor(Math.random() * 100) + 30,
  }))

  // Generate status distribution
  const statusDistribution = statuses.map((status) => ({
    status,
    count: Math.floor(Math.random() * 50) + 10,
  }))

  // Generate cross-analysis data
  const diseaseByCityData = cities.slice(0, 5).map((city) => ({
    city,
    diseases: diseases.slice(0, 3).map((disease) => ({
      disease,
      count: Math.floor(Math.random() * 10) + 2,
      revenue: Math.floor(Math.random() * 500000) + 100000,
      profit: Math.floor(Math.random() * 200000) + 50000,
    })),
  }))

  const hospitalByCityData = cities.slice(0, 5).map((city) => ({
    city,
    hospitals: hospitals.slice(0, 3).map((hospital) => ({
      hospital,
      surgeries: Math.floor(Math.random() * 15) + 3,
      revenue: Math.floor(Math.random() * 800000) + 200000,
      profit: Math.floor(Math.random() * 300000) + 80000,
    })),
  }))

  const diseaseByHospitalData = hospitals.slice(0, 5).map((hospital) => ({
    hospital,
    diseases: diseases.slice(0, 3).map((disease) => ({
      disease,
      count: Math.floor(Math.random() * 8) + 2,
      revenue: Math.floor(Math.random() * 600000) + 150000,
      profit: Math.floor(Math.random() * 250000) + 60000,
    })),
  }))

  return {
    kpis: {
      totalRevenue,
      totalProfit,
      totalLeads,
      completedSurgeries: totalSurgeries,
      conversionRate: totalLeads > 0 ? (totalSurgeries / totalLeads) * 100 : 0,
      avgTicketSize,
      avgNetProfitPerSurgery: avgNetProfit,
    },
    cityPerformance,
    diseasePerformance,
    hospitalPerformance,
    crossAnalysis: {
      diseaseByCity: diseaseByCityData,
      hospitalByCity: hospitalByCityData,
      diseaseByHospital: diseaseByHospitalData,
    },
    paymentModeAnalysis,
    revenueProfitTrends: trends,
    bdPerformance,
    teamPerformance,
    circlePerformance,
    statusDistribution,
    conversionFunnel: {
      totalLeads,
      followUps: Math.floor(totalLeads * 0.3),
      ipdDone: Math.floor(totalLeads * 0.2),
      completed: totalSurgeries,
    },
  }
}
