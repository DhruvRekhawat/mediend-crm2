'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import { generateHRDemoData } from '@/lib/demo-data/hr-analytics'
import {
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  Building2,
  UserCheck,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

export interface HRAnalytics {
  kpis: {
    bdCount: number
    activeTeamsCount: number
    overallAttendanceRate: number
    totalLeaves: number
    totalLeaveRequests: number
    avgLeavesPerEmployee: number
    lateArrivalsCount: number
    lateArrivalRate: number
  }
  bdPerformance: Array<{
    bdId: string
    bdName: string
    employeeCode: string
    teamName: string
    department: string
    revenue: number
    profit: number
    closedLeads: number
    totalLeads: number
    conversionRate: number
    targetAchievement: number
    targetMetric: string | null
  }>
  teamPerformance: Array<{
    teamName: string
    revenue: number
    profit: number
    closedLeads: number
    totalLeads: number
    conversionRate: number
    bdCount: number
  }>
  attendance: {
    overallRate: number
    lateArrivalsCount: number
    lateArrivalRate: number
    employeeAttendance: Array<{
      employeeId: string
      employeeName: string
      employeeCode: string
      department: string
      totalPunches: number
      lateArrivals: number
      onTimePunches: number
      attendanceRate: number
      lateArrivalRate: number
    }>
    dailyTrend: Array<{
      date: string
      total: number
      late: number
      onTime: number
      attendanceRate: number
    }>
    departmentAttendance: Array<{
      departmentName: string
      totalEmployees: number
      totalPunches: number
      latePunches: number
      attendanceRate: number
    }>
  }
  leaves: {
    totalLeaves: number
    totalRequests: number
    leaveTrends: Array<{
      date: string
      days: number
      requests: number
    }>
    highLeaveEmployees: Array<{
      employeeId: string
      employeeName: string
      employeeCode: string
      department: string
      totalLeaves: number
      leaveRequests: number
    }>
    leaveTypeDistribution: Array<{
      leaveType: string
      days: number
      requests: number
    }>
  }
}

const COLORS = {
  performance: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#10b981',
  attendance: '#10b981',
  target: '#8b5cf6',
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function MDHRDashboardPage() {
  const [useDemoData, setUseDemoData] = useState(false)
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
        endDate.setDate(0)
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

  const { data: analytics, isLoading } = useQuery<HRAnalytics>({
    queryKey: ['analytics', 'md', 'hr', dateRange, useDemoData],
    queryFn: async () => {
      if (useDemoData) {
        return generateHRDemoData()
      }
      const params = new URLSearchParams()
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }
      return apiGet<HRAnalytics>(`/api/analytics/md/hr?${params.toString()}`)
    },
    enabled: useDemoData || period === 'all' || (!!dateRange.startDate && !!dateRange.endDate),
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground mt-1">BD performance, attendance, and leave analytics</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant={useDemoData ? 'default' : 'outline'}
              onClick={() => setUseDemoData(!useDemoData)}
              className={useDemoData ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {useDemoData ? 'Using Demo Data' : 'Use Demo Data'}
            </Button>
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
              <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">BD Count</CardTitle>
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {analytics.kpis.bdCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total Business Developers</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                  <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {analytics.kpis.activeTeamsCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Teams with active BDs</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {analytics.kpis.overallAttendanceRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overall attendance</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {analytics.kpis.lateArrivalsCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics.kpis.lateArrivalRate.toFixed(1)}% of total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leaves</CardTitle>
                  <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                    {analytics.kpis.totalLeaves}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Days taken</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Leaves/BD</CardTitle>
                  <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {analytics.kpis.avgLeavesPerEmployee.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Average per employee</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* BD Performance Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Top BDs by Profit</CardTitle>
                  <CardDescription>Best performing Business Developers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      profit: { label: 'Profit', color: COLORS.performance },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={analytics.bdPerformance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="bdName" type="category" width={120} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="profit" fill={COLORS.performance} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Team Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance</CardTitle>
                  <CardDescription>Team comparison by profit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      profit: { label: 'Profit', color: COLORS.performance },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={analytics.teamPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="teamName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="profit" fill={COLORS.performance} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Attendance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trend</CardTitle>
                  <CardDescription>Daily attendance percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      attendanceRate: { label: 'Attendance %', color: COLORS.attendance },
                    }}
                    className="h-[300px]"
                  >
                    <LineChart data={analytics.attendance.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="attendanceRate"
                        stroke={COLORS.attendance}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Late Arrivals Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Late Arrivals</CardTitle>
                  <CardDescription>Employees with most late arrivals</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      lateArrivals: { label: 'Late Arrivals', color: COLORS.danger },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={analytics.attendance.employeeAttendance.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="employeeName" type="category" width={120} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="lateArrivals" fill={COLORS.danger} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Leave Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Trends</CardTitle>
                  <CardDescription>Leaves over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      days: { label: 'Leave Days', color: COLORS.warning },
                    }}
                    className="h-[300px]"
                  >
                    <AreaChart data={analytics.leaves.leaveTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="days"
                        stroke={COLORS.warning}
                        fill={COLORS.warning}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Department Attendance */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Attendance</CardTitle>
                  <CardDescription>Attendance by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      attendanceRate: { label: 'Attendance %', color: COLORS.attendance },
                      latePunches: { label: 'Late Punches', color: COLORS.danger },
                    }}
                    className="h-[300px]"
                  >
                    <ComposedChart data={analytics.attendance.departmentAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="departmentName" angle={-45} textAnchor="end" height={100} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar yAxisId="left" dataKey="attendanceRate" fill={COLORS.attendance} />
                      <Bar yAxisId="right" dataKey="latePunches" fill={COLORS.danger} />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Leave Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Type Distribution</CardTitle>
                  <CardDescription>Breakdown by leave type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={analytics.leaves.leaveTypeDistribution.reduce((acc, item) => {
                      acc[item.leaveType] = { label: item.leaveType }
                      return acc
                    }, {} as Record<string, { label: string }>)}
                    className="h-[300px]"
                  >
                    <RechartsPieChart>
                      <Pie
                        data={analytics.leaves.leaveTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ leaveType, days }) => `${leaveType}: ${days} days`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="days"
                      >
                        {analytics.leaves.leaveTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* BD Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>BD Performance</CardTitle>
                  <CardDescription>Comprehensive BD metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>BD Name</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Leads</TableHead>
                          <TableHead>Conv. %</TableHead>
                          <TableHead>Target %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.bdPerformance.slice(0, 15).map((bd) => (
                          <TableRow key={bd.bdId}>
                            <TableCell className="font-medium">{bd.bdName}</TableCell>
                            <TableCell>{bd.teamName}</TableCell>
                            <TableCell className="text-blue-600 dark:text-blue-400 font-semibold">
                              ₹{bd.profit.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>{bd.closedLeads}</TableCell>
                            <TableCell>{bd.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>
                              <Badge
                                variant={bd.targetAchievement >= 100 ? 'default' : 'secondary'}
                              >
                                {bd.targetAchievement.toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Late Arrivals Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Late Arrivals</CardTitle>
                  <CardDescription>Employees with frequent late arrivals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.attendance.employeeAttendance.slice(0, 15).map((emp) => (
                          <TableRow key={emp.employeeId}>
                            <TableCell className="font-medium">{emp.employeeName}</TableCell>
                            <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                            <TableCell>{emp.department}</TableCell>
                            <TableCell>{emp.totalPunches}</TableCell>
                            <TableCell className="text-red-600 dark:text-red-400 font-semibold">
                              {emp.lateArrivals}
                            </TableCell>
                            <TableCell>
                              <Badge variant={emp.lateArrivalRate > 20 ? 'destructive' : 'secondary'}>
                                {emp.lateArrivalRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* High Leave Employees */}
            <Card>
              <CardHeader>
                <CardTitle>High Leave Employees</CardTitle>
                <CardDescription>Employees with excessive leaves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Total Leaves</TableHead>
                        <TableHead>Requests</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.leaves.highLeaveEmployees.map((emp) => (
                        <TableRow key={emp.employeeId}>
                          <TableCell className="font-medium">{emp.employeeName}</TableCell>
                          <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                          <TableCell>{emp.department}</TableCell>
                          <TableCell className="text-amber-600 dark:text-amber-400 font-semibold">
                            {emp.totalLeaves} days
                          </TableCell>
                          <TableCell>{emp.leaveRequests}</TableCell>
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
