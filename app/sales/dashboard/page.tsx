'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { format } from 'date-fns'
import {
  Calendar as CalendarIcon,
  Activity,
  Users,
  Target,
  Stethoscope,
  BarChart3,
  Wallet,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react'

interface PipelineOverview {
  totalLeads: number
  byStage: Array<{ stage: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  recentLeads: { last7Days: number; last30Days: number }
  topCircles: Array<{ circle: string; count: number }>
  topSources: Array<{ source: string; count: number }>
}

interface IpdComparison {
  ipdThisMonth: number
  ipdByThisDayLastMonth: number
  ipdBestMonthByThisDay: number
  bestMonthThisYear: { month: number; monthLabel: string | null; count: number }
  asOfDate: string
  dayOfMonth: number
}

interface IpdBreakdown {
  byCircle: Array<{ circle: string; count: number; revenue: number; profit: number }>
  byDisease: Array<{ disease: string; count: number; revenue: number; profit: number }>
  byHospital: Array<{ hospitalName: string; city: string; circle: string; count: number; revenue: number; profit: number }>
  bySource: Array<{ source: string; count: number; revenue: number; profit: number }>
  byMonth: Array<{ month: string; count: number; revenue: number; profit: number }>
  surgeonCrossAnalysis: Array<{ surgeonName: string; hospitalName: string; treatment: string; count: number; revenue: number; profit: number }>
}

interface LeadsBreakdown {
  byCircle: Array<{ circle: string; totalLeads: number; converted: number; conversionRate: number }>
  byDisease: Array<{ disease: string; totalLeads: number; converted: number; conversionRate: number }>
  bySource: Array<{ source: string; totalLeads: number; converted: number; conversionRate: number }>
  byTeam: Array<{ teamName: string; totalLeads: number; converted: number; conversionRate: number }>
  leadAgeBreakdown: Array<{ bucket: string; totalLeads: number; converted: number; conversionRate: number }>
}

interface TargetSalary {
  teamTargetBreakdown: Array<{
    teamId: string | null
    teamName: string
    targets: Array<{ metric: string; targetValue: number; achieved: number; percentage: number }>
  }>
  bdSalaryTarget: Array<{
    bdId: string
    bdName: string
    teamName: string | null
    salary: number | null
    targetValue: number
    achieved: number
    ratio: number | null
  }>
}

interface TodayLeadAssignmentsResponse {
  date: string
  totalLeads: number
  assignments: Array<{ bdId: string; bdName: string; teamName: string | null; leadCount: number }>
}

function formatCurrency(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

export default function SalesDashboardPage() {
  const [isStartOpen, setIsStartOpen] = useState(false)
  const [isEndOpen, setIsEndOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date())

  const dateRange = {
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : '',
  }
  const params = () => (dateRange.startDate && dateRange.endDate ? `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}` : '')

  const { data: pipelineOverview } = useQuery<PipelineOverview>({
    queryKey: ['sales-dashboard', 'pipeline-overview'],
    queryFn: () => apiGet<PipelineOverview>('/api/analytics/sales-dashboard/pipeline-overview'),
  })

  const { data: comparison } = useQuery<IpdComparison>({
    queryKey: ['sales-dashboard', 'ipd-comparison'],
    queryFn: () => apiGet<IpdComparison>('/api/analytics/sales-dashboard/ipd-comparison'),
  })

  const { data: ipd } = useQuery<IpdBreakdown>({
    queryKey: ['sales-dashboard', 'ipd-breakdown', dateRange],
    queryFn: () => apiGet<IpdBreakdown>(`/api/analytics/sales-dashboard/ipd-breakdown${params()}`),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: leads } = useQuery<LeadsBreakdown>({
    queryKey: ['sales-dashboard', 'leads-breakdown', dateRange],
    queryFn: () => apiGet<LeadsBreakdown>(`/api/analytics/sales-dashboard/leads-breakdown${params()}`),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: target } = useQuery<TargetSalary>({
    queryKey: ['sales-dashboard', 'target-salary', dateRange],
    queryFn: () => apiGet<TargetSalary>(`/api/analytics/sales-dashboard/target-salary${params()}`),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: todayAssignments, isLoading: todayLoading } = useQuery<TodayLeadAssignmentsResponse>({
    queryKey: ['analytics', 'today-leads-assignments'],
    queryFn: () => apiGet<TodayLeadAssignmentsResponse>('/api/analytics/today-leads-assignments'),
    refetchInterval: 60000,
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">IPD & leads breakdown, targets and performance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">From</span>
            <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd MMM') : 'Pick'}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setIsStartOpen(false) }} />
              </DialogContent>
            </Dialog>
            <span className="text-sm text-muted-foreground">To</span>
            <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-[140px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd MMM') : 'Pick'}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setIsEndOpen(false) }} />
              </DialogContent>
            </Dialog>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined) }}>Clear</Button>
            )}
          </div>
        </div>

        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Lead pipeline overview
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">All leads in the CRM (synced from workspace + MySQL)</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Total leads</p>
                <p className="text-xl font-bold">{pipelineOverview?.totalLeads ?? '–'}</p>
              </div>
              <div className="rounded-lg border bg-blue-500/5 dark:bg-blue-950/20 p-3">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Active (Sales)</p>
                <p className="text-xl font-bold text-blue-800 dark:text-blue-300">
                  {pipelineOverview?.byStage?.find((s) => s.stage === 'SALES')?.count ?? '–'}
                </p>
              </div>
              <div className="rounded-lg border bg-emerald-500/5 dark:bg-emerald-950/20 p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Completed</p>
                <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                  {pipelineOverview?.byStage?.find((s) => s.stage === 'COMPLETED')?.count ?? '–'}
                </p>
              </div>
              <div className="rounded-lg border bg-rose-500/5 dark:bg-rose-950/20 p-3">
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400">Lost</p>
                <p className="text-xl font-bold text-rose-800 dark:text-rose-300">
                  {pipelineOverview?.byStage?.find((s) => s.stage === 'LOST')?.count ?? '–'}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-500/5 dark:bg-slate-950/20 p-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-400">Last 7 days</p>
                <p className="text-xl font-bold">{pipelineOverview?.recentLeads?.last7Days ?? '–'}</p>
              </div>
              <div className="rounded-lg border bg-slate-500/5 dark:bg-slate-950/20 p-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-400">Last 30 days</p>
                <p className="text-xl font-bold">{pipelineOverview?.recentLeads?.last30Days ?? '–'}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Top circles:</span>
                <div className="flex flex-wrap gap-1">
                  {pipelineOverview?.topCircles?.map((c) => (
                    <Badge key={c.circle} variant="secondary" className="font-normal">
                      {c.circle} ({c.count})
                    </Badge>
                  ))}
                  {(!pipelineOverview?.topCircles?.length) && <span className="text-muted-foreground text-sm">–</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Top sources:</span>
                <div className="flex flex-wrap gap-1">
                  {pipelineOverview?.topSources?.map((s) => (
                    <Badge key={s.source} variant="outline" className="font-normal">
                      {s.source} ({s.count})
                    </Badge>
                  ))}
                  {(!pipelineOverview?.topSources?.length) && <span className="text-muted-foreground text-sm">–</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IPD Comparison Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-emerald-500/5 dark:bg-emerald-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">IPD this month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{comparison?.ipdThisMonth ?? '–'}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">By this day last month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{comparison?.ipdByThisDayLastMonth ?? '–'}</p>
            </CardContent>
          </Card>
          <Card className="bg-violet-500/5 dark:bg-violet-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-400">Best month by day {comparison?.dayOfMonth ?? ''}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">{comparison?.ipdBestMonthByThisDay ?? '–'}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Best month this year</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                {comparison?.bestMonthThisYear?.count ?? '–'}
                {comparison?.bestMonthThisYear?.monthLabel != null && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">({comparison.bestMonthThisYear.monthLabel})</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* IPD Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              IPD breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="circle">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="circle">Circle</TabsTrigger>
                <TabsTrigger value="disease">Disease</TabsTrigger>
                <TabsTrigger value="hospital">Hospital</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
              <TabsContent value="circle" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Circle</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipd?.byCircle?.map((r) => (
                      <TableRow key={r.circle}>
                        <TableCell className="font-medium">{r.circle}</TableCell>
                        <TableCell className="text-right">{r.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.profit)}</TableCell>
                      </TableRow>
                    ))}
                    {(!ipd?.byCircle?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="disease" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Disease</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipd?.byDisease?.slice(0, 20).map((r) => (
                      <TableRow key={r.disease}><TableCell className="font-medium">{r.disease}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell><TableCell className="text-right">{formatCurrency(r.profit)}</TableCell></TableRow>
                    ))}
                    {(!ipd?.byDisease?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="hospital" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Hospital</TableHead><TableHead>City</TableHead><TableHead>Circle</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipd?.byHospital?.slice(0, 20).map((r) => (
                      <TableRow key={`${r.hospitalName}-${r.city}`}><TableCell className="font-medium">{r.hospitalName}</TableCell><TableCell>{r.city}</TableCell><TableCell>{r.circle}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell></TableRow>
                    ))}
                    {(!ipd?.byHospital?.length) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="source" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Source</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipd?.bySource?.map((r) => (
                      <TableRow key={r.source}><TableCell className="font-medium">{r.source}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell><TableCell className="text-right">{formatCurrency(r.profit)}</TableCell></TableRow>
                    ))}
                    {(!ipd?.bySource?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="month" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Month</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipd?.byMonth?.map((r) => (
                      <TableRow key={r.month}><TableCell className="font-medium">{r.month}</TableCell><TableCell className="text-right">{r.count}</TableCell><TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell><TableCell className="text-right">{formatCurrency(r.profit)}</TableCell></TableRow>
                    ))}
                    {(!ipd?.byMonth?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Surgeon cross-analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Surgeon × Hospital × Disease
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surgeon</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Treatment</TableHead>
                  <TableHead className="text-right">Surgeries</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipd?.surgeonCrossAnalysis?.slice(0, 30).map((r, i) => (
                  <TableRow key={`${r.surgeonName}-${r.hospitalName}-${r.treatment}-${i}`}>
                    <TableCell className="font-medium">{r.surgeonName}</TableCell>
                    <TableCell>{r.hospitalName}</TableCell>
                    <TableCell>{r.treatment}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.profit)}</TableCell>
                  </TableRow>
                ))}
                {(!ipd?.surgeonCrossAnalysis?.length) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Leads breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Leads breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="circle">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="circle">Circle</TabsTrigger>
                <TabsTrigger value="disease">Disease</TabsTrigger>
                <TabsTrigger value="source">Source</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
              </TabsList>
              <TabsContent value="circle" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Circle</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Converted</TableHead><TableHead className="text-right">Conv. %</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads?.byCircle?.map((r) => (
                      <TableRow key={r.circle}><TableCell className="font-medium">{r.circle}</TableCell><TableCell className="text-right">{r.totalLeads}</TableCell><TableCell className="text-right">{r.converted}</TableCell><TableCell className="text-right">{r.conversionRate.toFixed(1)}%</TableCell></TableRow>
                    ))}
                    {(!leads?.byCircle?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="disease" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Disease</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Converted</TableHead><TableHead className="text-right">Conv. %</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads?.byDisease?.slice(0, 20).map((r) => (
                      <TableRow key={r.disease}><TableCell className="font-medium">{r.disease}</TableCell><TableCell className="text-right">{r.totalLeads}</TableCell><TableCell className="text-right">{r.converted}</TableCell><TableCell className="text-right">{r.conversionRate.toFixed(1)}%</TableCell></TableRow>
                    ))}
                    {(!leads?.byDisease?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="source" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Source</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Converted</TableHead><TableHead className="text-right">Conv. %</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads?.bySource?.map((r) => (
                      <TableRow key={r.source}><TableCell className="font-medium">{r.source}</TableCell><TableCell className="text-right">{r.totalLeads}</TableCell><TableCell className="text-right">{r.converted}</TableCell><TableCell className="text-right">{r.conversionRate.toFixed(1)}%</TableCell></TableRow>
                    ))}
                    {(!leads?.bySource?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="team" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Team</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Converted</TableHead><TableHead className="text-right">Conv. %</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads?.byTeam?.map((r) => (
                      <TableRow key={r.teamName}><TableCell className="font-medium">{r.teamName}</TableCell><TableCell className="text-right">{r.totalLeads}</TableCell><TableCell className="text-right">{r.converted}</TableCell><TableCell className="text-right">{r.conversionRate.toFixed(1)}%</TableCell></TableRow>
                    ))}
                    {(!leads?.byTeam?.length) && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Lead age breakdown */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leads?.leadAgeBreakdown?.map((b) => (
            <Card key={b.bucket} className="bg-slate-500/5 dark:bg-slate-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-400">{b.bucket}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{b.totalLeads} leads</p>
                <p className="text-sm text-muted-foreground">{b.converted} converted · {b.conversionRate.toFixed(1)}%</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Target achievement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {target?.teamTargetBreakdown?.length ? (
              <div className="space-y-4">
                {target.teamTargetBreakdown.map((team) => (
                  <div key={team.teamId ?? 'no-team'}>
                    <p className="font-medium mb-2">{team.teamName}</p>
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Achieved</TableHead><TableHead className="text-right">%</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.targets.map((t) => (
                          <TableRow key={t.metric}>
                            <TableCell>{t.metric}</TableCell>
                            <TableCell className="text-right">{t.targetValue.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{t.achieved.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-20">
                                  <Progress value={Math.min(t.percentage, 100)} />
                                </div>
                                <span>{t.percentage.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4">No team targets in this period.</p>
            )}
          </CardContent>
        </Card>

        {/* Salary vs target */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Salary vs target (BD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BD</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Achieved</TableHead>
                  <TableHead className="text-right">Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {target?.bdSalaryTarget?.map((r) => (
                  <TableRow key={r.bdId}>
                    <TableCell className="font-medium">{r.bdName}</TableCell>
                    <TableCell>{r.teamName ?? '–'}</TableCell>
                    <TableCell className="text-right">{r.salary != null ? formatCurrency(r.salary) : '–'}</TableCell>
                    <TableCell className="text-right">{r.targetValue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.achieved.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.ratio != null ? r.ratio.toFixed(2) : '–'}</TableCell>
                  </TableRow>
                ))}
                {(!target?.bdSalaryTarget?.length) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Today's lead assignments */}
        <Card className="bg-slate-500/5 dark:bg-slate-950/20">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Today&apos;s lead assignments
              </CardTitle>
              <Badge variant="secondary">{todayAssignments?.totalLeads ?? 0} leads</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>BD</TableHead><TableHead className="hidden sm:table-cell">Team</TableHead><TableHead className="text-right">Assigned</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {todayAssignments?.assignments?.map((a) => (
                    <TableRow key={a.bdId}>
                      <TableCell className="font-medium">{a.bdName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{a.teamName ?? '–'}</TableCell>
                      <TableCell className="text-right"><Badge variant="default">{a.leadCount}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!todayAssignments?.assignments?.length) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No leads assigned today</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
