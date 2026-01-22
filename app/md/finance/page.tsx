'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useMemo } from 'react'
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
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
import { format } from 'date-fns'

export interface FinanceAnalytics {
  kpis: {
    totalRevenue: number
    totalExpenses: number
    netCashFlow: number
    pendingApprovalsCount: number
    approvedAmount: number
    rejectedAmount: number
  }
  transactionTrends: Array<{
    date: string
    credit: number
    debit: number
    netFlow: number
  }>
  partyAnalysis: Array<{
    partyId: string
    partyName: string
    partyType: string
    totalCredits: number
    totalDebits: number
    netAmount: number
    transactionCount: number
  }>
  headAnalysis: Array<{
    headId: string
    headName: string
    department: string | null
    totalCredits: number
    totalDebits: number
    netAmount: number
    transactionCount: number
  }>
  paymentModeAnalysis: Array<{
    paymentModeId: string
    paymentModeName: string
    totalCredits: number
    totalDebits: number
    netFlow: number
    transactionCount: number
    currentBalance: number
  }>
  approvalStatus: Array<{
    status: string
    count: number
    amount: number
  }>
  topTransactions: Array<{
    id: string
    serialNumber: string
    transactionDate: Date | string
    transactionType: string
    partyName: string
    partyType: string
    headName: string
    paymentModeName: string
    amount: number
    description: string
  }>
  pendingApprovals: Array<{
    id: string
    serialNumber: string
    transactionDate: Date | string
    transactionType: string
    partyName: string
    partyType: string
    headName: string
    paymentModeName: string
    amount: number
    description: string
    createdByName: string
  }>
}

const COLORS = {
  revenue: '#10b981',
  expenses: '#ef4444',
  netFlow: '#3b82f6',
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
}


export default function MDFinanceDashboardPage() {
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

  const { data: analytics, isLoading } = useQuery<FinanceAnalytics>({
    queryKey: ['analytics', 'md', 'finance', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate)
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate)
      }
      return apiGet<FinanceAnalytics>(`/api/analytics/md/finance?${params.toString()}`)
    },
    enabled: period === 'all' || (!!dateRange.startDate && !!dateRange.endDate),
  })

  const transactionTypeData = analytics
    ? [
        {
          name: 'Credit',
          value: analytics.kpis.totalRevenue,
          color: COLORS.revenue,
        },
        {
          name: 'Debit',
          value: analytics.kpis.totalExpenses,
          color: COLORS.expenses,
        },
      ]
    : []

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Finance Dashboard</h1>
            <p className="text-muted-foreground mt-1">Financial health and transaction analytics</p>
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-l-4 border-l-green-500 bg-linear-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ₹{analytics.kpis.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total credits (CREDIT)</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 bg-linear-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    ₹{analytics.kpis.totalExpenses.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total debits (DEBIT)</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                  <TrendingUp className={`h-5 w-5 ${analytics.kpis.netCashFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${analytics.kpis.netCashFlow >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                    ₹{analytics.kpis.netCashFlow.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Revenue - Expenses</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {analytics.kpis.pendingApprovalsCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Transactions awaiting approval</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    ₹{analytics.kpis.approvedAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total approved transactions</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 bg-linear-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected Amount</CardTitle>
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    ₹{analytics.kpis.rejectedAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total rejected transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue vs Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                  <CardDescription>Daily credit and debit trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      credit: { label: 'Revenue (Credit)', color: COLORS.revenue },
                      debit: { label: 'Expenses (Debit)', color: COLORS.expenses },
                    }}
                    className="h-[300px]"
                  >
                    <ComposedChart data={analytics.transactionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line yAxisId="left" type="monotone" dataKey="credit" stroke={COLORS.revenue} strokeWidth={2} name="Revenue" />
                      <Line yAxisId="left" type="monotone" dataKey="debit" stroke={COLORS.expenses} strokeWidth={2} name="Expenses" />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Transaction Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Type Distribution</CardTitle>
                  <CardDescription>Credit vs Debit breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      Credit: { label: 'Credit', color: COLORS.revenue },
                      Debit: { label: 'Debit', color: COLORS.expenses },
                    }}
                    className="h-[300px]"
                  >
                    <RechartsPieChart>
                      <Pie
                        data={transactionTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ₹${value.toLocaleString('en-IN')}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {transactionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Monthly Cash Flow */}
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Trend</CardTitle>
                  <CardDescription>Net flow over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      netFlow: { label: 'Net Flow', color: COLORS.netFlow },
                    }}
                    className="h-[300px]"
                  >
                    <AreaChart data={analytics.transactionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="netFlow"
                        stroke={COLORS.netFlow}
                        fill={COLORS.netFlow}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Approval Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Approval Status</CardTitle>
                  <CardDescription>Transaction approval breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={analytics.approvalStatus.reduce((acc, item) => {
                      acc[item.status] = { label: item.status }
                      return acc
                    }, {} as Record<string, { label: string }>)}
                    className="h-[300px]"
                  >
                    <RechartsPieChart>
                      <Pie
                        data={analytics.approvalStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, count }) => `${status}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analytics.approvalStatus.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.status === 'APPROVED'
                                ? COLORS.approved
                                : entry.status === 'REJECTED'
                                  ? COLORS.rejected
                                  : COLORS.pending
                            }
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Payment Mode Balances */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Mode Balances</CardTitle>
                  <CardDescription>Current balances by payment mode</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      currentBalance: { label: 'Balance', color: COLORS.netFlow },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={analytics.paymentModeAnalysis.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="paymentModeName" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="currentBalance" fill={COLORS.netFlow} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Party Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Parties</CardTitle>
                  <CardDescription>Highest transaction volumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      netAmount: { label: 'Net Amount', color: COLORS.netFlow },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={analytics.partyAnalysis.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="partyName" type="category" width={150} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="netAmount" fill={COLORS.netFlow} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Parties Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Parties</CardTitle>
                  <CardDescription>Parties with highest transaction volumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Party Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Debits</TableHead>
                          <TableHead>Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.partyAnalysis.slice(0, 10).map((party) => (
                          <TableRow key={party.partyId}>
                            <TableCell className="font-medium">{party.partyName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{party.partyType}</Badge>
                            </TableCell>
                            <TableCell className="text-green-600 dark:text-green-400">
                              ₹{party.totalCredits.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-red-600 dark:text-red-400">
                              ₹{party.totalDebits.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell
                              className={`font-semibold ${
                                party.netAmount >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              ₹{party.netAmount.toLocaleString('en-IN')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Approvals Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>Transactions awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serial</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Created By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.pendingApprovals.slice(0, 10).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-mono text-xs">{t.serialNumber}</TableCell>
                            <TableCell>
                              {format(new Date(t.transactionDate), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={t.transactionType === 'CREDIT' ? 'default' : 'destructive'}
                              >
                                {t.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell>{t.partyName}</TableCell>
                            <TableCell className="font-semibold">
                              ₹{t.amount.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>{t.createdByName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Top Transactions</CardTitle>
                <CardDescription>Largest credit and debit transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Head</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topTransactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs">{t.serialNumber}</TableCell>
                          <TableCell>
                            {format(new Date(t.transactionDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={t.transactionType === 'CREDIT' ? 'default' : 'destructive'}
                            >
                              {t.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell>{t.partyName}</TableCell>
                          <TableCell>{t.headName}</TableCell>
                          <TableCell>{t.paymentModeName}</TableCell>
                          <TableCell className="font-semibold">
                            ₹{t.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
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
