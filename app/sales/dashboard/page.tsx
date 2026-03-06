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
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Stethoscope, Building2, Activity, Users } from 'lucide-react'

interface DashboardStats {
  totalSurgeries: number
  totalProfit: number
  avgTicketSize: number
  totalLeads: number
  conversionRate: number
}

interface BdLeaderboardEntry {
  bdId: string
  bdName: string
  teamName: string
  closedLeads: number
  ipdDone?: number
  netProfit: number
}

interface TeamLeaderboardEntry {
  teamId: string
  teamName: string
  closedLeads: number
  ipdDone?: number
  netProfit: number
}

interface TeamLeadLeaderboardEntry {
  teamLeadId: string
  teamLeadName: string
  teamName: string
  closedLeads: number
  ipdDone: number
  netProfit: number
}

interface TodayLeadAssignment {
  bdId: string
  bdName: string
  bdEmail: string
  teamName: string | null
  teamCircle: string | null
  leadCount: number
  leads: Array<{ id: string; leadRef: string; patientName: string; createdDate: Date }>
}

interface TodayLeadAssignmentsResponse {
  date: string
  totalLeads: number
  assignments: TodayLeadAssignment[]
}

interface MedicalData {
  treatmentPerformance: Array<{
    treatment: string
    count: number
    revenue: number
    profit: number
    avgTicketSize: number
    conversionRate?: number
  }>
  hospitalPerformance: Array<{
    hospitalName: string
    city: string
    circle: string
    totalSurgeries: number
    revenue: number
    profit: number
  }>
}

interface SourceCampaignData {
  sourcePerformance: Array<{
    source: string
    campaignName: string | null
    bdeName: string | null
    totalLeads: number
    conversionRate: number
    revenue: number
    profit: number
  }>
}

function RankListRow({
  rank,
  name,
  primaryMetric,
  secondaryMetric,
}: {
  rank: number
  name: string
  primaryMetric: string
  secondaryMetric?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant={rank <= 3 ? 'default' : 'secondary'} className="shrink-0">
          #{rank}
        </Badge>
        <span className="font-medium truncate">{name}</span>
      </div>
      <div className="shrink-0 text-right text-sm">
        <span className="font-semibold">{primaryMetric}</span>
        {secondaryMetric && (
          <span className="text-muted-foreground block text-xs">{secondaryMetric}</span>
        )}
      </div>
    </div>
  )
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

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange)
      return apiGet<DashboardStats>(`/api/analytics/dashboard?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: bdLeaderboard } = useQuery<BdLeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'bd', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'bd', ...dateRange })
      return apiGet<BdLeaderboardEntry[]>(`/api/analytics/leaderboard?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: teamLeaderboard } = useQuery<TeamLeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'team', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'team', ...dateRange })
      return apiGet<TeamLeaderboardEntry[]>(`/api/analytics/leaderboard?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: teamLeadLeaderboard } = useQuery<TeamLeadLeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'teamlead', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ type: 'teamlead', ...dateRange })
      return apiGet<TeamLeadLeaderboardEntry[]>(`/api/analytics/leaderboard?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: medicalData } = useQuery<MedicalData>({
    queryKey: ['analytics', 'medical', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange)
      return apiGet<MedicalData>(`/api/analytics/medical?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: sourceData } = useQuery<SourceCampaignData>({
    queryKey: ['analytics', 'source-campaign', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(dateRange)
      return apiGet<SourceCampaignData>(`/api/analytics/source-campaign?${params}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: todayAssignments, isLoading: todayLoading } = useQuery<TodayLeadAssignmentsResponse>({
    queryKey: ['analytics', 'today-leads-assignments'],
    queryFn: () => apiGet<TodayLeadAssignmentsResponse>('/api/analytics/today-leads-assignments'),
    refetchInterval: 60000,
  })

  const formatCurrency = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

  return (
    <AuthenticatedLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Performance overview by surgeries and revenue</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From</span>
              <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[140px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd MMM') : 'Pick'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); setIsStartOpen(false) }}
                  />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To</span>
              <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[140px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd MMM') : 'Pick'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setIsEndOpen(false) }}
                  />
                </DialogContent>
              </Dialog>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(undefined); setEndDate(undefined) }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-emerald-500/5 dark:bg-emerald-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Surgeries done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{stats?.totalSurgeries ?? '–'}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Net profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">{stats ? formatCurrency(stats.totalProfit) : '–'}</p>
            </CardContent>
          </Card>
          <Card className="bg-violet-500/5 dark:bg-violet-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-400">
                Avg ticket size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">
                {stats ? formatCurrency(stats.avgTicketSize) : '–'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboards: BD, Team, Team Lead */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="bg-amber-500/5 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-amber-800 dark:text-amber-200">Top BDs</CardTitle>
            </CardHeader>
            <CardContent>
              {bdLeaderboard && bdLeaderboard.length > 0 ? (
                <div className="space-y-0">
                  {bdLeaderboard.slice(0, 10).map((bd, i) => (
                    <RankListRow
                      key={bd.bdId}
                      rank={i + 1}
                      name={bd.bdName}
                      primaryMetric={`${bd.closedLeads} surgeries`}
                      secondaryMetric={formatCurrency(bd.netProfit)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-teal-500/5 dark:bg-teal-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-teal-800 dark:text-teal-200">Top teams</CardTitle>
            </CardHeader>
            <CardContent>
              {teamLeaderboard && teamLeaderboard.length > 0 ? (
                <div className="space-y-0">
                  {teamLeaderboard.slice(0, 10).map((team, i) => (
                    <RankListRow
                      key={team.teamId}
                      rank={i + 1}
                      name={team.teamName}
                      primaryMetric={`${team.closedLeads} surgeries`}
                      secondaryMetric={formatCurrency(team.netProfit)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-indigo-500/5 dark:bg-indigo-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-indigo-800 dark:text-indigo-200">Top team leads</CardTitle>
            </CardHeader>
            <CardContent>
              {teamLeadLeaderboard && teamLeadLeaderboard.length > 0 ? (
                <div className="space-y-0">
                  {teamLeadLeaderboard.slice(0, 10).map((tl, i) => (
                    <RankListRow
                      key={tl.teamLeadId}
                      rank={i + 1}
                      name={tl.teamLeadName}
                      primaryMetric={`${tl.closedLeads} surgeries`}
                      secondaryMetric={formatCurrency(tl.netProfit)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hospitals & treatments */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="bg-sky-500/5 dark:bg-sky-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-sky-800 dark:text-sky-200">
                <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Top hospitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicalData?.hospitalPerformance && medicalData.hospitalPerformance.length > 0 ? (
                <div className="space-y-0">
                  {medicalData.hospitalPerformance.slice(0, 10).map((h, i) => (
                    <RankListRow
                      key={`${h.hospitalName}-${h.city}`}
                      rank={i + 1}
                      name={`${h.hospitalName} (${h.city})`}
                      primaryMetric={`${h.totalSurgeries} surgeries`}
                      secondaryMetric={formatCurrency(h.revenue)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-rose-500/5 dark:bg-rose-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-800 dark:text-rose-200">
                <Stethoscope className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Top treatments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medicalData?.treatmentPerformance && medicalData.treatmentPerformance.length > 0 ? (
                <div className="space-y-0">
                  {medicalData.treatmentPerformance.slice(0, 10).map((t, i) => {
                    const surgeries = Math.round((t.count * (t.conversionRate ?? 0)) / 100)
                    return (
                      <RankListRow
                        key={t.treatment}
                        rank={i + 1}
                        name={t.treatment}
                        primaryMetric={`${surgeries} surgeries`}
                        secondaryMetric={formatCurrency(t.revenue)}
                      />
                    )
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Best lead sources */}
        <Card className="bg-cyan-500/5 dark:bg-cyan-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
              <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Best lead sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceData?.sourcePerformance && sourceData.sourcePerformance.length > 0 ? (
              <div className="space-y-0">
                {sourceData.sourcePerformance.slice(0, 10).map((s, i) => {
                  const surgeries = Math.round((s.totalLeads * s.conversionRate) / 100)
                  return (
                    <RankListRow
                      key={`${s.source}-${s.campaignName ?? ''}-${s.bdeName ?? ''}`}
                      rank={i + 1}
                      name={s.source}
                      primaryMetric={`${surgeries} surgeries · ${s.conversionRate.toFixed(1)}% conv.`}
                      secondaryMetric={formatCurrency(s.revenue)}
                    />
                  )
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Today's lead assignments */}
        <Card className="bg-slate-500/5 dark:bg-slate-950/20">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                Today&apos;s lead assignments
              </CardTitle>
              <Badge variant="secondary" className="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                {todayAssignments?.totalLeads ?? 0} leads
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BD</TableHead>
                    <TableHead className="hidden sm:table-cell">Team</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAssignments?.assignments.map((a) => (
                    <TableRow key={a.bdId}>
                      <TableCell className="font-medium">{a.bdName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {a.teamName ?? '–'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{a.leadCount}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!todayAssignments?.assignments?.length) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No leads assigned today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
