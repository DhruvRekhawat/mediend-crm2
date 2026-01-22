'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  Activity,
  Users,
  BarChart3,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from 'recharts'

export interface SalesAnalytics {
  kpis: {
    totalRevenue: number
    totalProfit: number
    totalLeads: number
    completedSurgeries: number
    conversionRate: number
    avgTicketSize: number
    avgNetProfitPerSurgery: number
  }
  cityPerformance: Array<{
    city: string
    revenue: number
    profit: number
    surgeries: number
    leads: number
    conversionRate: number
    avgTicketSize: number
  }>
  diseasePerformance: Array<{
    disease: string
    count: number
    revenue: number
    profit: number
  }>
  hospitalPerformance: Array<{
    hospital: string
    surgeries: number
    revenue: number
    profit: number
  }>
  crossAnalysis: {
    diseaseByCity: Array<{ city: string; diseases: Array<{ disease: string; count: number; revenue: number; profit: number }> }>
    hospitalByCity: Array<{ city: string; hospitals: Array<{ hospital: string; surgeries: number; revenue: number; profit: number }> }>
    diseaseByHospital: Array<{ hospital: string; diseases: Array<{ disease: string; count: number; revenue: number; profit: number }> }>
  }
  paymentModeAnalysis: Array<{
    mode: string
    count: number
    revenue: number
    profit: number
  }>
  revenueProfitTrends: Array<{
    date: string
    revenue: number
    profit: number
    surgeries: number
  }>
  bdPerformance: Array<{
    bdId: string
    bdName: string
    teamName: string
    revenue: number
    profit: number
    closedLeads: number
    totalLeads: number
    conversionRate: number
  }>
  teamPerformance: Array<{
    teamName: string
    revenue: number
    profit: number
    closedLeads: number
    totalLeads: number
    conversionRate: number
  }>
  circlePerformance: Array<{
    circle: string
    revenue: number
    profit: number
    surgeries: number
  }>
  statusDistribution: Array<{
    status: string
    count: number
  }>
  conversionFunnel: {
    totalLeads: number
    followUps: number
    ipdDone: number
    completed: number
  }
}

const COLORS = {
  revenue: '#10b981',
  profit: '#3b82f6',
  leads: '#8b5cf6',
  warning: '#f59e0b',
  success: '#059669',
  danger: '#ef4444',
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316']

export default function MDSalesDashboardPage() {
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [period, setPeriod] = useState('all')

  const dateRange = useMemo(() => {
    if (period === 'custom') {
      return customDateRange
    }
    if (period === 'all') {
      return { startDate: '', endDate: '' }
    }

    const endDate = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90':
        startDate.setDate(endDate.getDate() - 90)
        break
      case 'thisMonth':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
        break
      case 'lastMonth':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1)
        endDate.setDate(0) // Last day of previous month
        break
      case 'thisYear':
        startDate = new Date(endDate.getFullYear(), 0, 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
  }, [period, customDateRange])

  const { data: analytics, isLoading } = useQuery<SalesAnalytics>({
    queryKey: ['analytics', 'md', 'sales', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }
      const data = await apiGet<SalesAnalytics>(`/api/analytics/md/sales?${params.toString()}`)
      return data
    },
    enabled: period === 'all' || (!!dateRange.startDate && !!dateRange.endDate),
  })


  const paymentModeChartData = useMemo(() => {
    if (!analytics?.paymentModeAnalysis) return []
    const total = analytics.paymentModeAnalysis.reduce((sum, p) => sum + p.count, 0)
    return analytics.paymentModeAnalysis.map((p) => ({
      name: p.mode === 'cash' || p.mode.toLowerCase().includes('cash') ? 'Cash' : 
            p.mode === 'cashless' || p.mode.toLowerCase().includes('cashless') ? 'Cashless' : p.mode,
      value: p.count,
      percentage: total > 0 ? ((p.count / total) * 100).toFixed(1) : 0,
      revenue: p.revenue,
      profit: p.profit,
    }))
  }, [analytics])

  const topCities = useMemo(() => analytics?.cityPerformance.slice(0, 10) || [], [analytics])
  const topHospitals = useMemo(() => analytics?.hospitalPerformance.slice(0, 10) || [], [analytics])

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground mt-1">Comprehensive sales analytics and insights</p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 w-24 bg-slate-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-32 bg-slate-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-green-500 bg-linear-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ₹{analytics.kpis.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Bill amount from completed surgeries</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    ₹{analytics.kpis.totalProfit.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total net profit realized</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 bg-linear-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {analytics.kpis.totalLeads.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leads created in period</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Surgeries</CardTitle>
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {analytics.kpis.completedSurgeries.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Surgeries completed</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {analytics.kpis.conversionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leads to surgeries</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-cyan-500 bg-linear-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
                  <DollarSign className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                    ₹{analytics.kpis.avgTicketSize.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Average per surgery</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Net Profit</CardTitle>
                  <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    ₹{analytics.kpis.avgNetProfitPerSurgery.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Per surgery</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* City Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Cities by Revenue</CardTitle>
                  <CardDescription>Best performing cities</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCities.length > 0 ? (
                    <ChartContainer
                      config={{
                        revenue: { label: 'Revenue', color: COLORS.revenue },
                      }}
                      className="h-[300px]"
                    >
                      <BarChart data={topCities}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No city data available for the selected period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Mode */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Mode Distribution</CardTitle>
                  <CardDescription>Cash vs Cashless breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentModeChartData.length > 0 ? (
                    <ChartContainer
                      config={paymentModeChartData.reduce((acc, item) => {
                        acc[item.name] = { label: item.name }
                        return acc
                      }, {} as Record<string, { label: string }>)}
                      className="h-[300px]"
                    >
                      <RechartsPieChart>
                        <Pie
                          data={paymentModeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentModeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No payment mode data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.revenueProfitTrends && analytics.revenueProfitTrends.length > 0 ? (
                    <ChartContainer
                      config={{
                        revenue: { label: 'Revenue', color: COLORS.revenue },
                      }}
                      className="h-[300px]"
                    >
                      <LineChart data={analytics.revenueProfitTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="revenue" stroke={COLORS.revenue} strokeWidth={2} />
                      </LineChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No revenue trend data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profit Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit Trend</CardTitle>
                  <CardDescription>Daily profit over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.revenueProfitTrends && analytics.revenueProfitTrends.length > 0 ? (
                    <ChartContainer
                      config={{
                        profit: { label: 'Profit', color: COLORS.profit },
                      }}
                      className="h-[300px]"
                    >
                      <AreaChart data={analytics.revenueProfitTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="profit" stroke={COLORS.profit} fill={COLORS.profit} fillOpacity={0.3} />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No profit trend data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Circle Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Circle Performance</CardTitle>
                  <CardDescription>Revenue and profit by circle</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.circlePerformance && analytics.circlePerformance.length > 0 ? (
                    <ChartContainer
                      config={{
                        revenue: { label: 'Revenue', color: COLORS.revenue },
                        profit: { label: 'Profit', color: COLORS.profit },
                      }}
                      className="h-[300px]"
                    >
                      <ComposedChart data={analytics.circlePerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="circle" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar yAxisId="left" dataKey="revenue" fill={COLORS.revenue} />
                        <Bar yAxisId="right" dataKey="profit" fill={COLORS.profit} />
                      </ComposedChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No circle performance data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Status Distribution</CardTitle>
                  <CardDescription>Breakdown of lead statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.statusDistribution && analytics.statusDistribution.length > 0 ? (
                    <ChartContainer
                      config={analytics.statusDistribution.reduce((acc, item) => {
                        acc[item.status] = { label: item.status }
                        return acc
                      }, {} as Record<string, { label: string }>)}
                      className="h-[300px]"
                    >
                      <RechartsPieChart>
                        <Pie
                          data={analytics.statusDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, count }) => `${status}: ${count}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analytics.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No status distribution data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Tables */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* BD Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>BD Performance Leaderboard</CardTitle>
                  <CardDescription>Top performing Business Developers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>BD Name</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Leads</TableHead>
                          <TableHead>Conv. %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.bdPerformance.slice(0, 10).map((bd, index) => (
                          <TableRow key={bd.bdId}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{bd.bdName}</TableCell>
                            <TableCell>{bd.teamName}</TableCell>
                            <TableCell>₹{bd.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                              ₹{bd.profit.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>{bd.closedLeads}</TableCell>
                            <TableCell>{bd.conversionRate.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Team Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                  <CardDescription>Team comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Leads</TableHead>
                          <TableHead>Conv. %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.teamPerformance.map((team, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{team.teamName}</TableCell>
                            <TableCell>₹{team.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                              ₹{team.profit.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>{team.closedLeads}</TableCell>
                            <TableCell>{team.conversionRate.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Hospitals Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Hospitals</CardTitle>
                <CardDescription>Best performing hospitals by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hospital</TableHead>
                        <TableHead>Surgeries</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topHospitals.map((hospital, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{hospital.hospital}</TableCell>
                          <TableCell>{hospital.surgeries}</TableCell>
                          <TableCell>₹{hospital.revenue.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                            ₹{hospital.profit.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No data available for the selected period</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
