'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar as CalendarIcon,
  FileText,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Activity,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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
  ipdDone?: number
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

interface MedicalData {
  treatmentPerformance: Array<{
    treatment: string
    count: number
    revenue: number
    profit: number
    avgTicketSize: number
    avgProfitMargin: number
    conversionRate: number
  }>
  hospitalPerformance: Array<{
    hospitalName: string
    city: string
    circle: string
    totalSurgeries: number
    revenue: number
    profit: number
    hospitalShare: number
    avgTicketSize: number
    avgDiscount: number
    avgCopay: number
    avgSettledAmount: number
  }>
  surgeonPerformance: Array<{
    surgeonName: string
    surgeonType: string
    totalSurgeries: number
    revenue: number
    profit: number
    doctorShare: number
    avgTicketSize: number
  }>
}

interface FinancialData {
  financialBreakdown: {
    totalBillAmount: number
    totalDiscount: number
    totalCopay: number
    totalDeduction: number
    totalSettledAmount: number
    totalNetProfit: number
    mediendProfit: number
    hospitalShare: number
    doctorShare: number
    othersShare: number
    profitMargin: number
    discountRate: number
  }
  paymentModeAnalysis: Array<{
    modeOfPayment: string
    count: number
    totalAmount: number
    avgAmount: number
    percentage: number
  }>
  insuranceAnalysis: Array<{
    insuranceName: string
    tpa: string | null
    totalCases: number
    approvedCases: number
    rejectedCases: number
    approvalRate: number
    avgSumInsured: number
    avgRoomRent: number
    avgICU: number
    avgCapping: number
    avgSettlementAmount: number
    avgCopay: number
    revenue: number
    profit: number
  }>
}

interface TrendsData {
  period: string
  trendData: Array<{
    period: string
    leadsCreated: number
    leadsCompleted: number
    leadsLost: number
    revenue: number
    profit: number
    conversionRate: number
    avgTicketSize: number
    avgTimeToClose?: number
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
    avgTicketSize: number
    qualityScore: number
  }>
  campaignAnalysis: Array<{
    campaignName: string
    source: string
    totalLeads: number
    conversionRate: number
    revenue: number
    profit: number
    startDate?: string
    endDate?: string
    cities?: string[]
    topTreatments?: string[]
  }>
}

interface TargetData {
  overallSummary: {
    leadsClosed: { target: number; achieved: number; percentage: number }
    netProfit: { target: number; achieved: number; percentage: number }
    billAmount: { target: number; achieved: number; percentage: number }
    surgeriesDone: { target: number; achieved: number; percentage: number }
  }
  targetAchievements: Array<{
    targetId: string
    targetType: string
    entityName: string
    metric: string
    periodType: string
    periodStartDate: string
    periodEndDate: string
    targetValue: number
    achieved: number
    percentage: number
    bonusRules: Array<{
      id: string
      type: string
      threshold: number
      bonusAmount: number | null
      bonusPercentage: number | null
      capAmount: number | null
    }>
  }>
}

interface OperationalData {
  leadVelocity: {
    avgSalesToInsurance: number
    avgInsuranceToPL: number
    avgPLToCompleted: number
    avgEndToEnd: number
  }
  followUpMetrics: {
    totalLeadsRequiringFollowUp: number
    leadsWithScheduledFollowUp: number
    overdueFollowUps: number
    complianceRate: number
    bdCompliance: Array<{
      bd: string
      rate: number
    }>
  }
  dataQuality: {
    leadsWithPhone: number
    leadsWithEmail: number
    leadsWithAlternate: number
    leadsWithInsurance: number
    leadsWithTreatment: number
    duplicateLeads: number
    invalidNumbers: number
    overallQualityScore: number
  }
}

interface RiskAlertsData {
  atRiskLeads: {
    leadsStuckInSales: number
    leadsStuckInInsurance: number
    overdueFollowUps: number
    dnpLeads: number
    highValueAtRisk: number
  }
  criticalLeads: Array<{
    id: string
    leadRef: string
    patientName: string
    riskType: string
    daysStuck: number
    billAmount: number
    bdName: string
  }>
}

export default function MDSalesDashboardPage() {
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
  const { data: medicalData } = useQuery<MedicalData>({
    queryKey: ['analytics', 'medical', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<MedicalData>(`/api/analytics/medical?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: financialData } = useQuery<FinancialData>({
    queryKey: ['analytics', 'financial', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<FinancialData>(`/api/analytics/financial?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: trendsData } = useQuery<TrendsData>({
    queryKey: ['analytics', 'trends', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period: 'daily',
      })
      return apiGet<TrendsData>(`/api/analytics/trends?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: sourceCampaignData } = useQuery<SourceCampaignData>({
    queryKey: ['analytics', 'source-campaign', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<SourceCampaignData>(`/api/analytics/source-campaign?${params.toString()}`)
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

  const { data: operationalData } = useQuery<OperationalData>({
    queryKey: ['analytics', 'operational', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<OperationalData>(`/api/analytics/operational?${params.toString()}`)
    },
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  })

  const { data: riskAlertsData } = useQuery<RiskAlertsData>({
    queryKey: ['analytics', 'risk-alerts', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      return apiGet<RiskAlertsData>(`/api/analytics/risk-alerts?${params.toString()}`)
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
          <Card className="border-l-4 border-l-blue-500 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
              <CardTitle className="text-blue-700 dark:text-blue-300">Pipeline Stage Breakdown</CardTitle>
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
            <CardDescription>Team performance ranking by cases closed</CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : teamLeaderboard && teamLeaderboard.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={teamLeaderboard.slice(0, 10)} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="teamName" 
                      tick={{ fontSize: 12 }}
                      width={90}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Net Profit' || name === 'Revenue') {
                          return [`₹${value.toLocaleString('en-IN')}`, name]
                        }
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="closedLeads" 
                      name="Cases Closed"
                      fill="#22c55e" 
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar 
                      dataKey="totalLeads" 
                      name="Total Leads"
                      fill="#3b82f6" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No team data available</div>
            )}
          </CardContent>
        </Card>

        {/* BD Leaderboard */}
        <Card className="border-l-4 border-l-amber-500 shadow-md">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
            <CardTitle className="text-amber-700 dark:text-amber-300">BD Leaderboard</CardTitle>
            <CardDescription>Top performing Business Development executives by cases closed (IPD Done, Closed, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            {bdsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : bdLeaderboard && bdLeaderboard.length > 0 ? (
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={bdLeaderboard.slice(0, 15)} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="bdName" 
                      tick={{ fontSize: 11 }}
                      width={110}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Net Profit' || name === 'Avg Ticket') {
                          return [`₹${value.toLocaleString('en-IN')}`, name]
                        }
                        return [value, name]
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="closedLeads" 
                      name="Cases Closed"
                      fill="#f59e0b" 
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar 
                      dataKey="ipdDone" 
                      name="IPD Done"
                      fill="#22c55e" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No BD data available</div>
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
        <Tabs defaultValue="medical" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
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

          {/* Medical Analytics */}
          <TabsContent value="medical" className="space-y-4">
            {medicalData ? (
               <>
                {/* Top Treatments Chart */}
                <Card className="border-l-4 border-l-rose-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/20">
                    <CardTitle className="text-rose-700 dark:text-rose-300">Top 10 Treatments by Revenue</CardTitle>
                    <CardDescription>Treatment performance by revenue and case count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {medicalData.treatmentPerformance && medicalData.treatmentPerformance.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={medicalData.treatmentPerformance.slice(0, 10)} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="treatment" 
                              tick={{ fontSize: 11 }}
                              width={140}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No treatment data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Hospitals Chart */}
                <Card className="border-l-4 border-l-pink-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-950/20">
                    <CardTitle className="text-pink-700 dark:text-pink-300">Top 10 Hospitals by Revenue</CardTitle>
                    <CardDescription>Hospital performance by revenue and surgeries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {medicalData.hospitalPerformance && medicalData.hospitalPerformance.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={medicalData.hospitalPerformance.slice(0, 10)} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 180, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              type="number" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="hospitalName" 
                              tick={{ fontSize: 10 }}
                              width={170}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => [`₹${value.toLocaleString('en-IN')}`, name]}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="#ec4899" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No hospital data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Surgeons Chart */}
                <Card className="border-l-4 border-l-fuchsia-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-fuchsia-50 to-transparent dark:from-fuchsia-950/20">
                    <CardTitle className="text-fuchsia-700 dark:text-fuchsia-300">Top 10 Surgeons by Surgeries</CardTitle>
                    <CardDescription>Surgeon performance by surgeries count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {medicalData.surgeonPerformance && medicalData.surgeonPerformance.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={medicalData.surgeonPerformance.slice(0, 10)} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis 
                              type="category" 
                              dataKey="surgeonName" 
                              tick={{ fontSize: 11 }}
                              width={140}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === 'Doctor Share' || name === 'Revenue') {
                                  return [`₹${value.toLocaleString('en-IN')}`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Bar dataKey="totalSurgeries" name="Surgeries" fill="#d946ef" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No surgeon data available</div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Financial Analytics */}
          <TabsContent value="financial" className="space-y-4">
            {financialData ? (
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
                    <CardTitle className="text-lime-700 dark:text-lime-300">Payment Mode Distribution</CardTitle>
                    <CardDescription>Breakdown of cases by payment mode</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {financialData.paymentModeAnalysis && financialData.paymentModeAnalysis.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={financialData.paymentModeAnalysis}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ modeOfPayment, percentage }) => `${modeOfPayment}: ${percentage.toFixed(1)}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="count"
                                nameKey="modeOfPayment"
                              >
                                {financialData.paymentModeAnalysis.map((entry: any, index: number) => {
                                  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e']
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                                formatter={(value: number, name: string, props: any) => {
                                  return [`${value} cases (₹${props.payload.totalAmount.toLocaleString('en-IN')})`, name]
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Stats List */}
                        <div className="space-y-3">
                          {financialData.paymentModeAnalysis.map((mode: any, index: number) => {
                            const colors = ['bg-green-500', 'bg-blue-500', 'bg-amber-500', 'bg-pink-500', 'bg-purple-500', 'bg-cyan-500', 'bg-rose-500']
                            return (
                              <div key={mode.modeOfPayment} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                                  <div>
                                    <p className="font-medium">{mode.modeOfPayment}</p>
                                    <p className="text-sm text-muted-foreground">{mode.count} cases</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">₹{mode.totalAmount.toLocaleString('en-IN')}</p>
                                  <p className="text-sm text-muted-foreground">{mode.percentage.toFixed(1)}%</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No payment mode data available</div>
                    )}
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
            ) : null}
          </TabsContent>

          {/* Trends Analytics */}
          <TabsContent value="trends" className="space-y-4">
            {trendsData ? (
              <>
                {/* Leads Trend Chart */}
                <Card className="border-l-4 border-l-orange-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
                    <CardTitle className="text-orange-700 dark:text-orange-300">Lead Trends - {trendsData.period}</CardTitle>
                    <CardDescription>Daily leads created, completed, and lost over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendsData.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              return `${date.getDate()}/${date.getMonth() + 1}`
                            }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelFormatter={(value) => {
                              const date = new Date(value)
                              return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="leadsCreated" 
                            name="Leads Created"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="leadsCompleted" 
                            name="Leads Completed"
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="leadsLost" 
                            name="Leads Lost"
                            stroke="#ef4444" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue & Profit Trend Chart */}
                <Card className="border-l-4 border-l-emerald-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                    <CardTitle className="text-emerald-700 dark:text-emerald-300">Revenue & Profit Trends</CardTitle>
                    <CardDescription>Daily revenue and profit over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendsData.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              return `${date.getDate()}/${date.getMonth() + 1}`
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelFormatter={(value) => {
                              const date = new Date(value)
                              return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            }}
                            formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                          />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversion Rate & Avg Ticket Size Chart */}
                <Card className="border-l-4 border-l-purple-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20">
                    <CardTitle className="text-purple-700 dark:text-purple-300">Conversion & Ticket Size Trends</CardTitle>
                    <CardDescription>Daily conversion rate and average ticket size</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendsData.trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="period" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              return `${date.getDate()}/${date.getMonth() + 1}`
                            }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelFormatter={(value) => {
                              const date = new Date(value)
                              return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="conversionRate" 
                            name="Conversion Rate (%)"
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="avgTicketSize" 
                            name="Avg Ticket Size (₹)"
                            stroke="#06b6d4" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Source & Campaign Analytics */}
          <TabsContent value="source" className="space-y-4">
            {sourceCampaignData ? (
              <>
                {/* Lead Source Performance Chart */}
                <Card className="border-l-4 border-l-yellow-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-950/20">
                    <CardTitle className="text-yellow-700 dark:text-yellow-300">Lead Source Performance</CardTitle>
                    <CardDescription>Leads and revenue by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sourceCampaignData.sourcePerformance && sourceCampaignData.sourcePerformance.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={sourceCampaignData.sourcePerformance.slice(0, 12)} 
                            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="source" 
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              yAxisId="left"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === 'Revenue') {
                                  return [`₹${value.toLocaleString('en-IN')}`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="totalLeads" name="Total Leads" fill="#eab308" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No source data available</div>
                    )}
                  </CardContent>
                </Card>

                {/* Campaign Analysis Chart */}
                <Card className="border-l-4 border-l-amber-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
                    <CardTitle className="text-amber-700 dark:text-amber-300">Campaign Performance</CardTitle>
                    <CardDescription>Campaign comparison by leads and conversion rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {sourceCampaignData.campaignAnalysis && sourceCampaignData.campaignAnalysis.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={sourceCampaignData.campaignAnalysis.slice(0, 10)} 
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis 
                              type="category" 
                              dataKey="campaignName" 
                              tick={{ fontSize: 11 }}
                              width={140}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                              formatter={(value: number, name: string) => {
                                if (name === 'Revenue') {
                                  return [`₹${value.toLocaleString('en-IN')}`, name]
                                }
                                if (name === 'Conversion Rate') {
                                  return [`${value.toFixed(1)}%`, name]
                                }
                                return [value, name]
                              }}
                            />
                            <Legend />
                            <Bar dataKey="totalLeads" name="Total Leads" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="conversionRate" name="Conversion Rate" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">No campaign data available</div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Target Achievement */}
          <TabsContent value="target" className="space-y-4">
            {targetData ? (
              <>
                {(() => {
                  const data = targetData as TargetData
                  return (
                    <>
                    <div className="grid gap-4 md:grid-cols-4">
                      <Card className="border-l-4 border-l-green-500 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
                          <CardTitle className="text-sm text-green-700 dark:text-green-300">Leads Closed</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {data.overallSummary.leadsClosed.achieved || 0} /{' '}
                            {data.overallSummary.leadsClosed.target || 0}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.overallSummary.leadsClosed.percentage.toFixed(1) || 0}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-emerald-500 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                          <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">Net Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ₹{data.overallSummary.netProfit.achieved.toLocaleString('en-IN') || '0'} / ₹
                            {data.overallSummary.netProfit.target.toLocaleString('en-IN') || '0'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.overallSummary.netProfit.percentage.toFixed(1) || 0}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-teal-500 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-950/20">
                          <CardTitle className="text-sm text-teal-700 dark:text-teal-300">Bill Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ₹{data.overallSummary.billAmount.achieved.toLocaleString('en-IN') || '0'} / ₹
                            {data.overallSummary.billAmount.target.toLocaleString('en-IN') || '0'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.overallSummary.billAmount.percentage.toFixed(1) || 0}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-cyan-500 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-950/20">
                          <CardTitle className="text-sm text-cyan-700 dark:text-cyan-300">Surgeries Done</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {data.overallSummary.surgeriesDone.achieved || 0} /{' '}
                            {data.overallSummary.surgeriesDone.target || 0}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {data.overallSummary.surgeriesDone.percentage.toFixed(1) || 0}%
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
                            {data.targetAchievements.map((target: any) => (
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
                  )
                })()}
              </>
            ) : null}
          </TabsContent>

          {/* Operational Metrics */}
          <TabsContent value="operational" className="space-y-4">
            {operationalData ? (
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
            ) : null}
          </TabsContent>

          {/* Risk Alerts */}
          <TabsContent value="risks" className="space-y-4">
            {riskAlertsData ? (
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

                <Card className="border-l-4 border-l-red-500 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20">
                    <CardTitle className="text-red-700 dark:text-red-300">Critical Leads Requiring Attention</CardTitle>
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
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
