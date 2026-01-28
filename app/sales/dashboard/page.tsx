'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar as CalendarIcon,
  FileText,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Building2,
  Stethoscope,
  Activity,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DashboardStats {
  totalSurgeries: number
  totalProfit: number
  avgTicketSize: number
  totalLeads: number
  conversionRate: number
}

interface StageStats {
  pipelineStages: {
    SALES: number
    INSURANCE: number
    PL: number
    COMPLETED: number
    LOST: number
  }
  statusCategories: {
    new: number
    followUps: number
    ipdDone: number
    dnp: number
    lost: number
    completed: number
  }
}

interface LeaderboardEntry {
  bdId?: string
  bdName?: string
  teamId?: string
  teamName?: string
  totalLeads?: number
  closedLeads: number
  conversionRate?: number
  revenue?: number
  netProfit: number
  avgTicketSize?: number
}

interface TodayLeadAssignment {
  bdId: string
  bdName: string
  bdEmail: string
  teamName: string | null
  teamCircle: string | null
  leadCount: number
  leads: Array<{
    id: string
    leadRef: string
    patientName: string
    createdDate: Date
  }>
}

interface TodayLeadAssignmentsResponse {
  date: string
  totalLeads: number
  assignments: TodayLeadAssignment[]
}

export default function SalesDashboardPage() {
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date
  })
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date())

  const dateRange = {
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : '',
  }

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<DashboardStats>(`/api/analytics/dashboard?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: stageStats } = useQuery<StageStats>({
    queryKey: ['analytics', 'stage-stats', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<StageStats>(`/api/analytics/stage-stats?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: teamLeaderboard, isLoading: teamsLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'team', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: 'team',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<LeaderboardEntry[]>(`/api/analytics/leaderboard?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: bdLeaderboard, isLoading: bdsLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['analytics', 'leaderboard', 'bd', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: 'bd',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<LeaderboardEntry[]>(`/api/analytics/leaderboard?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: todayAssignments, isLoading: todayLoading } = useQuery<TodayLeadAssignmentsResponse>({
    queryKey: ['analytics', 'today-leads-assignments'],
    queryFn: () => apiGet<TodayLeadAssignmentsResponse>('/api/analytics/today-leads-assignments'),
    refetchInterval: 60000, // Refetch every minute to keep data fresh
  })

  // Phase 2-4 Analytics Queries
  const { data: geographicData } = useQuery({
    queryKey: ['analytics', 'geographic', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/geographic?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: medicalData } = useQuery({
    queryKey: ['analytics', 'medical', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/medical?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: financialData } = useQuery({
    queryKey: ['analytics', 'financial', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/financial?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: trendsData } = useQuery({
    queryKey: ['analytics', 'trends', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: 'daily',
      })
      return apiGet(`/api/analytics/trends?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: sourceCampaignData } = useQuery({
    queryKey: ['analytics', 'source-campaign', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/source-campaign?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: targetData } = useQuery({
    queryKey: ['analytics', 'target-achievement', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/target-achievement?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: operationalData } = useQuery({
    queryKey: ['analytics', 'operational', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/operational?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: riskAlertsData } = useQuery({
    queryKey: ['analytics', 'risk-alerts', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet(`/api/analytics/risk-alerts?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Dashboard</h1>
            <p className="text-muted-foreground mt-1">Sales performance overview</p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
              <Dialog open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PP') : 'Pick date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date)
                      setIsStartCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
              <Dialog open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PP') : 'Pick date'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date)
                      setIsEndCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </DialogContent>
              </Dialog>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate(undefined)
                  setEndDate(undefined)
                }}
                className="text-muted-foreground"
              >
                Clear dates
              </Button>
            )}
          </div>
        </div>

        {/* Pipeline Stage Breakdown */}
        {stageStats && (
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stage Breakdown</CardTitle>
              <CardDescription>Leads by pipeline stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">SALES</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {stageStats.pipelineStages.SALES}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">INSURANCE</p>
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                          {stageStats.pipelineStages.INSURANCE}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">PL</p>
                        <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                          {stageStats.pipelineStages.PL}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">COMPLETED</p>
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                          {stageStats.pipelineStages.COMPLETED}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gray-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">LOST</p>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                          {stageStats.pipelineStages.LOST}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-950/30 flex items-center justify-center">
                        <XCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Category Breakdown */}
        {stageStats && (
          <Card className="border-l-4 border-l-purple-500 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20">
              <CardTitle className="text-purple-700 dark:text-purple-300">Status Category Breakdown</CardTitle>
              <CardDescription>Leads by status category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">New Leads</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                          {stageStats.statusCategories.new}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Follow-ups</p>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                          {stageStats.statusCategories.followUps}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">IPD Done</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {stageStats.statusCategories.ipdDone}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-slate-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">DNP</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                          {stageStats.statusCategories.dnp}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-950/30 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-gray-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Lost/Inactive</p>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                          {stageStats.statusCategories.lost}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-950/30 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-teal-500">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                          {stageStats.statusCategories.completed}
                        </p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-950/30 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Leaderboard */}
        <Card className="border-l-4 border-l-emerald-500 shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
            <CardTitle className="text-emerald-700 dark:text-emerald-300">Team Leaderboard</CardTitle>
            <CardDescription>Team performance ranking</CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Closed Leads</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Net Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamLeaderboard?.map((team, index) => (
                    <TableRow key={team.teamId}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{team.teamName}</TableCell>
                      <TableCell>{team.totalLeads || 0}</TableCell>
                      <TableCell>{team.closedLeads}</TableCell>
                      <TableCell>
                        {team.conversionRate !== undefined ? `${team.conversionRate.toFixed(1)}%` : '0%'}
                      </TableCell>
                      <TableCell>₹{team.revenue?.toLocaleString('en-IN') || '0'}</TableCell>
                      <TableCell>₹{team.netProfit.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  {(!teamLeaderboard || teamLeaderboard.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No team data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* BD Leaderboard */}
        <Card className="border-l-4 border-l-amber-500 shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
            <CardTitle className="text-amber-700 dark:text-amber-300">BD Leaderboard</CardTitle>
            <CardDescription>Top performing Business Development executives</CardDescription>
          </CardHeader>
          <CardContent>
            {bdsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>BD Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Total Leads</TableHead>
                    <TableHead>Closed Leads</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Net Profit</TableHead>
                    <TableHead>Avg Ticket Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bdLeaderboard?.slice(0, 20).map((bd, index) => (
                    <TableRow key={bd.bdId}>
                      <TableCell>
                        <Badge variant={index < 3 ? 'default' : 'secondary'}>#{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{bd.bdName}</TableCell>
                      <TableCell>{bd.teamName || 'No Team'}</TableCell>
                      <TableCell>{bd.totalLeads || 0}</TableCell>
                      <TableCell>{bd.closedLeads}</TableCell>
                      <TableCell>
                        {bd.conversionRate !== undefined ? `${bd.conversionRate.toFixed(1)}%` : '0%'}
                      </TableCell>
                      <TableCell>₹{bd.netProfit.toLocaleString('en-IN')}</TableCell>
                      <TableCell>₹{bd.avgTicketSize?.toLocaleString('en-IN') || '0'}</TableCell>
                    </TableRow>
                  ))}
                  {(!bdLeaderboard || bdLeaderboard.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No BD data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Today's Lead Assignments */}
        <Card className="border-l-4 border-l-teal-500 shadow-md">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-950/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-teal-700 dark:text-teal-300">Today&apos;s Lead Assignments</CardTitle>
                <CardDescription>
                  New leads assigned to BDs today ({todayAssignments?.date || new Date().toISOString().split('T')[0]})
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <Badge variant="outline" className="bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">
                  {todayAssignments?.totalLeads || 0} Total Leads
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BD Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Leads Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAssignments?.assignments.map((assignment) => (
                    <TableRow key={assignment.bdId}>
                      <TableCell className="font-medium">{assignment.bdName}</TableCell>
                      <TableCell className="text-muted-foreground">{assignment.bdEmail}</TableCell>
                      <TableCell>
                        {assignment.teamName ? (
                          <div className="flex items-center gap-2">
                            <span>{assignment.teamName}</span>
                            {assignment.teamCircle && (
                              <Badge variant="outline" className="text-xs">
                                {assignment.teamCircle}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No Team</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="text-sm">
                          {assignment.leadCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!todayAssignments || todayAssignments.assignments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No leads assigned today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Extended Analytics - Phase 2-4 */}
        <Tabs defaultValue="geographic" className="w-full">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="geographic">
              <MapPin className="mr-2 h-4 w-4" />
              Geographic
            </TabsTrigger>
            <TabsTrigger value="medical">
              <Stethoscope className="mr-2 h-4 w-4" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="financial">
              <DollarSign className="mr-2 h-4 w-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="trends">
              <BarChart3 className="mr-2 h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="source">
              <Activity className="mr-2 h-4 w-4" />
              Source
            </TabsTrigger>
            <TabsTrigger value="target">
              <Target className="mr-2 h-4 w-4" />
              Targets
            </TabsTrigger>
            <TabsTrigger value="operational">
              <Clock className="mr-2 h-4 w-4" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="risks">
              <Shield className="mr-2 h-4 w-4" />
              Risks
            </TabsTrigger>
          </TabsList>

          {/* Geographic Analytics */}
          <TabsContent value="geographic" className="space-y-4">
            {geographicData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Circle Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Circle</TableHead>
                          <TableHead>Total Leads</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {geographicData.circlePerformance?.map((circle: any) => (
                          <TableRow key={circle.circle}>
                            <TableCell className="font-medium">{circle.circle}</TableCell>
                            <TableCell>{circle.totalLeads}</TableCell>
                            <TableCell>{circle.completedSurgeries}</TableCell>
                            <TableCell>{circle.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>₹{circle.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{circle.profit.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20">
                    <CardTitle className="text-violet-700 dark:text-violet-300">Top 20 Cities by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>City</TableHead>
                          <TableHead>Circle</TableHead>
                          <TableHead>Total Leads</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Top Hospital</TableHead>
                          <TableHead>Top Treatment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {geographicData.cityPerformance?.map((city: any) => (
                          <TableRow key={city.city}>
                            <TableCell className="font-medium">{city.city}</TableCell>
                            <TableCell>{city.circle}</TableCell>
                            <TableCell>{city.totalLeads}</TableCell>
                            <TableCell>{city.completedSurgeries}</TableCell>
                            <TableCell>{city.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>₹{city.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{city.topHospital || 'N/A'}</TableCell>
                            <TableCell>{city.topTreatment || 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Medical Analytics */}
          <TabsContent value="medical" className="space-y-4">
            {medicalData && (
              <>
                <Card className="border-l-4 border-l-rose-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/20">
                    <CardTitle className="text-rose-700 dark:text-rose-300">Top 20 Treatments by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Treatment</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Avg Ticket Size</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicalData.treatmentPerformance?.map((treatment: any) => (
                          <TableRow key={treatment.treatment}>
                            <TableCell className="font-medium">{treatment.treatment}</TableCell>
                            <TableCell>{treatment.count}</TableCell>
                            <TableCell>₹{treatment.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{treatment.profit.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{treatment.avgTicketSize.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{treatment.conversionRate.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-pink-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-950/20">
                    <CardTitle className="text-pink-700 dark:text-pink-300">Top 20 Hospitals by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hospital</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Surgeries</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Profit</TableHead>
                          <TableHead>Hospital Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicalData.hospitalPerformance?.map((hospital: any) => (
                          <TableRow key={hospital.hospitalName}>
                            <TableCell className="font-medium">{hospital.hospitalName}</TableCell>
                            <TableCell>{hospital.city}</TableCell>
                            <TableCell>{hospital.totalSurgeries}</TableCell>
                            <TableCell>₹{hospital.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{hospital.profit.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{hospital.hospitalShare.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-fuchsia-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-fuchsia-50 to-transparent dark:from-fuchsia-950/20">
                    <CardTitle className="text-fuchsia-700 dark:text-fuchsia-300">Top 20 Surgeons by Surgeries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Surgeon</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Surgeries</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Doctor Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {medicalData.surgeonPerformance?.map((surgeon: any) => (
                          <TableRow key={surgeon.surgeonName}>
                            <TableCell className="font-medium">{surgeon.surgeonName}</TableCell>
                            <TableCell>{surgeon.surgeonType}</TableCell>
                            <TableCell>{surgeon.totalSurgeries}</TableCell>
                            <TableCell>₹{surgeon.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{surgeon.doctorShare.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Financial Analytics */}
          <TabsContent value="financial" className="space-y-4">
            {financialData && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-green-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
                      <CardTitle className="text-sm text-green-700 dark:text-green-300">Total Bill Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{financialData.financialBreakdown?.totalBillAmount.toLocaleString('en-IN') || '0'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                      <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">Total Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{financialData.financialBreakdown?.totalNetProfit.toLocaleString('en-IN') || '0'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-cyan-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-950/20">
                      <CardTitle className="text-sm text-cyan-700 dark:text-cyan-300">Profit Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {financialData.financialBreakdown?.profitMargin.toFixed(1) || '0'}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-sky-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-sky-50 to-transparent dark:from-sky-950/20">
                      <CardTitle className="text-sm text-sky-700 dark:text-sky-300">Mediend Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{financialData.financialBreakdown?.mediendProfit.toLocaleString('en-IN') || '0'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-l-4 border-l-lime-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-lime-50 to-transparent dark:from-lime-950/20">
                    <CardTitle className="text-lime-700 dark:text-lime-300">Payment Mode Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Mode</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Avg Amount</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData.paymentModeAnalysis?.map((mode: any) => (
                          <TableRow key={mode.modeOfPayment}>
                            <TableCell className="font-medium">{mode.modeOfPayment}</TableCell>
                            <TableCell>{mode.count}</TableCell>
                            <TableCell>₹{mode.totalAmount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>₹{mode.avgAmount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{mode.percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
                    <CardTitle className="text-blue-700 dark:text-blue-300">Insurance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insurance</TableHead>
                          <TableHead>TPA</TableHead>
                          <TableHead>Total Cases</TableHead>
                          <TableHead>Approved</TableHead>
                          <TableHead>Approval Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialData.insuranceAnalysis?.slice(0, 20).map((insurance: any) => (
                          <TableRow key={insurance.insuranceName}>
                            <TableCell className="font-medium">{insurance.insuranceName}</TableCell>
                            <TableCell>{insurance.tpa || 'N/A'}</TableCell>
                            <TableCell>{insurance.totalCases}</TableCell>
                            <TableCell>{insurance.approvedCases}</TableCell>
                            <TableCell>{insurance.approvalRate.toFixed(1)}%</TableCell>
                            <TableCell>₹{insurance.revenue.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Trends Analytics */}
          <TabsContent value="trends" className="space-y-4">
            {trendsData && (
              <Card className="border-l-4 border-l-orange-500 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
                  <CardTitle className="text-orange-700 dark:text-orange-300">Trend Analysis - {trendsData.period}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Leads Created</TableHead>
                        <TableHead>Leads Completed</TableHead>
                        <TableHead>Leads Lost</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Profit</TableHead>
                        <TableHead>Conversion Rate</TableHead>
                        <TableHead>Avg Ticket Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trendsData.trendData?.map((trend: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trend.period}</TableCell>
                          <TableCell>{trend.leadsCreated}</TableCell>
                          <TableCell>{trend.leadsCompleted}</TableCell>
                          <TableCell>{trend.leadsLost}</TableCell>
                          <TableCell>₹{trend.revenue.toLocaleString('en-IN')}</TableCell>
                          <TableCell>₹{trend.profit.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{trend.conversionRate.toFixed(1)}%</TableCell>
                          <TableCell>₹{trend.avgTicketSize.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Source & Campaign Analytics */}
          <TabsContent value="source" className="space-y-4">
            {sourceCampaignData && (
              <>
                <Card className="border-l-4 border-l-yellow-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
                    <CardTitle className="text-yellow-700 dark:text-yellow-300">Lead Source Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>BDE</TableHead>
                          <TableHead>Total Leads</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Quality Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceCampaignData.sourcePerformance?.slice(0, 20).map((source: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{source.source}</TableCell>
                            <TableCell>{source.campaignName || 'N/A'}</TableCell>
                            <TableCell>{source.bdeName || 'N/A'}</TableCell>
                            <TableCell>{source.totalLeads}</TableCell>
                            <TableCell>{source.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>₹{source.revenue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge variant={source.qualityScore > 50 ? 'default' : 'secondary'}>
                                {source.qualityScore.toFixed(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
                    <CardTitle className="text-amber-700 dark:text-amber-300">Campaign Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Total Leads</TableHead>
                          <TableHead>Conversion Rate</TableHead>
                          <TableHead>Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sourceCampaignData.campaignAnalysis?.map((campaign: any) => (
                          <TableRow key={campaign.campaignName}>
                            <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                            <TableCell>{campaign.source}</TableCell>
                            <TableCell>{campaign.totalLeads}</TableCell>
                            <TableCell>{campaign.conversionRate.toFixed(1)}%</TableCell>
                            <TableCell>₹{campaign.revenue.toLocaleString('en-IN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Target Achievement */}
          <TabsContent value="target" className="space-y-4">
            {targetData && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-l-4 border-l-green-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
                      <CardTitle className="text-sm text-green-700 dark:text-green-300">Leads Closed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {targetData.overallSummary?.leadsClosed.achieved || 0} /{' '}
                        {targetData.overallSummary?.leadsClosed.target || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {targetData.overallSummary?.leadsClosed.percentage.toFixed(1) || 0}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                      <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{targetData.overallSummary?.netProfit.achieved.toLocaleString('en-IN') || '0'} / ₹
                        {targetData.overallSummary?.netProfit.target.toLocaleString('en-IN') || '0'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {targetData.overallSummary?.netProfit.percentage.toFixed(1) || 0}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-teal-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-950/20">
                      <CardTitle className="text-sm text-teal-700 dark:text-teal-300">Bill Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹{targetData.overallSummary?.billAmount.achieved.toLocaleString('en-IN') || '0'} / ₹
                        {targetData.overallSummary?.billAmount.target.toLocaleString('en-IN') || '0'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {targetData.overallSummary?.billAmount.percentage.toFixed(1) || 0}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-cyan-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-950/20">
                      <CardTitle className="text-sm text-cyan-700 dark:text-cyan-300">Surgeries Done</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {targetData.overallSummary?.surgeriesDone.achieved || 0} /{' '}
                        {targetData.overallSummary?.surgeriesDone.target || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {targetData.overallSummary?.surgeriesDone.percentage.toFixed(1) || 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-l-4 border-l-indigo-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/20">
                    <CardTitle className="text-indigo-700 dark:text-indigo-300">Target Achievement Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entity</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Achieved</TableHead>
                          <TableHead>Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {targetData.targetAchievements?.map((target: any) => (
                          <TableRow key={target.targetId}>
                            <TableCell className="font-medium">{target.entityName}</TableCell>
                            <TableCell>{target.metric}</TableCell>
                            <TableCell>{target.targetValue.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{target.achieved.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge variant={target.percentage >= 100 ? 'default' : 'secondary'}>
                                {target.percentage.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Operational Metrics */}
          <TabsContent value="operational" className="space-y-4">
            {operationalData && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
                      <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Avg Sales to Insurance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {operationalData.leadVelocity?.avgSalesToInsurance.toFixed(1) || '0'} days
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20">
                      <CardTitle className="text-sm text-purple-700 dark:text-purple-300">Avg Insurance to PL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {operationalData.leadVelocity?.avgInsuranceToPL.toFixed(1) || '0'} days
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-pink-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-950/20">
                      <CardTitle className="text-sm text-pink-700 dark:text-pink-300">Avg PL to Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {operationalData.leadVelocity?.avgPLToCompleted.toFixed(1) || '0'} days
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-rose-500 shadow-md">
                    <CardHeader className="bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/20">
                      <CardTitle className="text-sm text-rose-700 dark:text-rose-300">Avg End to End</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {operationalData.leadVelocity?.avgEndToEnd.toFixed(1) || '0'} days
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-l-4 border-l-violet-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20">
                    <CardTitle className="text-violet-700 dark:text-violet-300">Follow-up Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Leads Requiring Follow-up</span>
                        <span className="font-bold">{operationalData.followUpMetrics?.totalLeadsRequiringFollowUp || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leads with Scheduled Follow-up</span>
                        <span className="font-bold">{operationalData.followUpMetrics?.leadsWithScheduledFollowUp || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overdue Follow-ups</span>
                        <span className="font-bold text-red-600">{operationalData.followUpMetrics?.overdueFollowUps || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compliance Rate</span>
                        <span className="font-bold">
                          {operationalData.followUpMetrics?.complianceRate.toFixed(1) || '0'}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-fuchsia-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-fuchsia-50 to-transparent dark:from-fuchsia-950/20">
                    <CardTitle className="text-fuchsia-700 dark:text-fuchsia-300">Data Quality Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Leads with Phone</span>
                        <span>{operationalData.dataQuality?.leadsWithPhone || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leads with Email</span>
                        <span>{operationalData.dataQuality?.leadsWithEmail || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duplicate Leads</span>
                        <span className="text-red-600">{operationalData.dataQuality?.duplicateLeads || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overall Quality Score</span>
                        <Badge variant={operationalData.dataQuality?.overallQualityScore > 80 ? 'default' : 'secondary'}>
                          {operationalData.dataQuality?.overallQualityScore.toFixed(1) || '0'}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Risk Alerts */}
          <TabsContent value="risks" className="space-y-4">
            {riskAlertsData && (
              <>
                <div className="grid gap-4 md:grid-cols-5">
                  <Card className="border-l-4 border-l-red-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Stuck in SALES</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {riskAlertsData.atRiskLeads?.leadsStuckInSales || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Stuck in INSURANCE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {riskAlertsData.atRiskLeads?.leadsStuckInInsurance || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <CardTitle className="text-sm">Overdue Follow-ups</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {riskAlertsData.atRiskLeads?.overdueFollowUps || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-gray-500">
                    <CardHeader>
                      <CardTitle className="text-sm">DNP Leads</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-gray-600">
                        {riskAlertsData.atRiskLeads?.dnpLeads || 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <CardTitle className="text-sm">High Value At Risk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {riskAlertsData.atRiskLeads?.highValueAtRisk || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Critical Leads Requiring Attention</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Ref</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Risk Type</TableHead>
                          <TableHead>Days Stuck</TableHead>
                          <TableHead>Bill Amount</TableHead>
                          <TableHead>BD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riskAlertsData.criticalLeads?.slice(0, 50).map((lead: any) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.leadRef}</TableCell>
                            <TableCell>{lead.patientName}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{lead.riskType}</Badge>
                            </TableCell>
                            <TableCell>{lead.daysStuck} days</TableCell>
                            <TableCell>₹{lead.billAmount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{lead.bdName}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
