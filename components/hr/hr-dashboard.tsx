'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import {
  Users,
  UserCheck,
  Wallet,
  MessageSquare,
  Clock,
  Calendar,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface HRAnalytics {
  kpis: {
    todayStrength: number
    totalHeadcount: number
    monthlySalaryOutgo: number
    openTicketsCount: number
    avgTicketResponseHours: number | null
    pendingLeaveCount: number
    hasPayrollData: boolean
  }
  departmentSalaryBreakdown: Array<{ departmentName: string; amount: number }>
  teamSalaryBreakdown: Array<{ teamName: string; amount: number }>
  departmentHeadcount: Array<{ departmentName: string; count: number }>
  ticketAnalytics: Array<{
    type: string
    targetRole: string | null
    totalInMonth: number
    resolvedCount: number
    avgResponseHours: number | null
    slaCompliancePercent: number | null
  }>
  month: number
  year: number
}

const COLORS = {
  strength: '#10b981',      // emerald-500
  headcount: '#3b82f6',    // blue-500
  salary: '#8b5cf6',       // violet-500
  tickets: '#f59e0b',      // amber-500
  responseTime: '#06b6d4',  // cyan-500
  leaves: '#f43f5e',       // rose-500
}

const CHART_PALETTE = ['#3b82f6', '#8b5cf6', '#6366f1', '#4f46e5', '#7c3aed', '#a855f7']

function formatCurrency(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function formatHours(h: number | null) {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${h.toFixed(1)} hrs`
}

interface HRDashboardProps {
  title?: string
  description?: string
}

export function HRDashboard({ title = 'HR Dashboard', description = 'Strength, salary, and ticket analytics' }: HRDashboardProps) {
  const now = new Date()
  const [period, setPeriod] = useState<'thisMonth' | 'lastMonth' | 'custom'>('thisMonth')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const { month, year } = useMemo(() => {
    if (period === 'thisMonth') {
      return { month: now.getMonth() + 1, year: now.getFullYear() }
    }
    if (period === 'lastMonth') {
      const last = new Date(now.getFullYear(), now.getMonth() - 1)
      return { month: last.getMonth() + 1, year: last.getFullYear() }
    }
    return { month: selectedMonth, year: selectedYear }
  }, [period, selectedMonth, selectedYear, now])

  const { data: analytics, isLoading } = useQuery<HRAnalytics>({
    queryKey: ['analytics', 'md', 'hr', month, year],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('month', String(month))
      params.append('year', String(year))
      return apiGet<HRAnalytics>(`/api/analytics/md/hr?${params.toString()}`)
    },
    enabled: true,
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as 'thisMonth' | 'lastMonth' | 'custom')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(month)}
            onValueChange={(v) => {
              setPeriod('custom')
              setSelectedMonth(parseInt(v, 10))
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setPeriod('custom')
              setSelectedYear(parseInt(v, 10))
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => year - i).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="border-l-4 border-l-emerald-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Strength</CardTitle>
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {analytics.kpis.todayStrength} / {analytics.kpis.totalHeadcount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Present / Total headcount</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Headcount</CardTitle>
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {analytics.kpis.totalHeadcount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All employees</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-violet-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Salary</CardTitle>
                <Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                  {formatCurrency(analytics.kpis.monthlySalaryOutgo)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.kpis.hasPayrollData ? 'Actual payroll' : 'CTC estimate'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {analytics.kpis.openTicketsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Support + Mental health</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-cyan-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                  {formatHours(analytics.kpis.avgTicketResponseHours)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">48hr SLA target</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                <Calendar className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {analytics.kpis.pendingLeaveCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department-wise Salary</CardTitle>
                <CardDescription>
                  {analytics.kpis.hasPayrollData ? 'Net payable' : 'CTC estimate'} for {MONTHS[month - 1]} {year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: { label: 'Amount', color: COLORS.salary },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={analytics.departmentSalaryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="departmentName" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
                    <Bar dataKey="amount" fill={COLORS.salary} radius={[4, 4, 0, 0]}>
                      {analytics.departmentSalaryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team-wise Salary</CardTitle>
                <CardDescription>
                  {analytics.kpis.hasPayrollData ? 'Net payable' : 'CTC estimate'} by team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: { label: 'Amount', color: COLORS.salary },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={analytics.teamSalaryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamName" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
                    <Bar dataKey="amount" fill={COLORS.salary} radius={[4, 4, 0, 0]}>
                      {analytics.teamSalaryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[(i + 2) % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Headcount</CardTitle>
                <CardDescription>Employees per department</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={analytics.departmentHeadcount.reduce((acc, d) => {
                    acc[d.departmentName] = { label: d.departmentName }
                    return acc
                  }, {} as Record<string, { label: string }>)}
                  className="h-[300px]"
                >
                  <RechartsPieChart>
                    <Pie
                      data={analytics.departmentHeadcount}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ departmentName, count }) => `${departmentName}: ${count}`}
                      outerRadius={100}
                      dataKey="count"
                    >
                      {analytics.departmentHeadcount.map((_, index) => (
                        <Cell key={index} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Response Analytics</CardTitle>
                <CardDescription>
                  {MONTHS[month - 1]} {year} — 48hr SLA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Resolved</TableHead>
                        <TableHead>Avg Response</TableHead>
                        <TableHead>SLA %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.ticketAnalytics.map((t) => (
                        <TableRow key={t.type}>
                          <TableCell className="font-medium">{t.type}</TableCell>
                          <TableCell>{t.totalInMonth}</TableCell>
                          <TableCell>{t.resolvedCount}</TableCell>
                          <TableCell>{formatHours(t.avgResponseHours)}</TableCell>
                          <TableCell>
                            {t.slaCompliancePercent != null ? (
                              <Badge
                                variant={
                                  t.slaCompliancePercent >= 90
                                    ? 'default'
                                    : t.slaCompliancePercent >= 70
                                      ? 'secondary'
                                      : 'destructive'
                                }
                              >
                                {t.slaCompliancePercent.toFixed(0)}%
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No data available for the selected period</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
