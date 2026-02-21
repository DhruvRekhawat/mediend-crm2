'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { format, startOfDay, startOfMonth } from 'date-fns'
import { useRouter } from 'next/navigation'
import { CaseStage } from '@prisma/client'
import { useState, useMemo } from 'react'
import {
  FileText, AlertCircle, CheckCircle2, Clock, ArrowRight,
  Receipt, Shield, Activity, Search, LayoutList, CalendarDays, BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { PreAuthStatus } from '@prisma/client'
import { useAuth } from '@/hooks/use-auth'
import { canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'
import { Input } from '@/components/ui/input'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface LeadWithStage {
  id: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  hospitalName: string
  treatment?: string
  caseStage: CaseStage
  createdDate: string
  updatedDate: string
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
    preAuthData?: {
      id: string
      requestedHospitalName?: string | null
      requestedRoomType?: string | null
      diseaseDescription?: string | null
      diseaseImages?: Array<{ name: string; url: string }> | null
      preAuthRaisedAt?: string | null
      sumInsured?: string | null
      roomRent?: string | null
      capping?: string | null
      copay?: string | null
      icu?: string | null
      insurance?: string | null
      tpa?: string | null
      hospitalNameSuggestion?: string | null
      hospitalSuggestions?: string[] | null
      roomTypes?: Array<{ name: string; rent: string }> | null
      handledAt?: string | null
      approvalStatus?: PreAuthStatus
      rejectionReason?: string | null
      handledBy?: { id: string; name: string } | null
      preAuthRaisedBy?: { id: string; name: string } | null
    } | null
  } | null
  admissionRecord?: { id: string; admissionDate: string; admittingHospital: string } | null
  dischargeSheet?: { id: string } | null
  insuranceInitiateForm?: { id: string } | null
}

type TabKey =
  | 'kyp-review'
  | 'preauth-raised'
  | 'preauth-complete'
  | 'admitted'
  | 'discharge-pending'
  | 'ipd-done'
  | 'all-patients'

const KYP_STAGES: CaseStage[] = [
  CaseStage.KYP_BASIC_PENDING,
  CaseStage.KYP_BASIC_COMPLETE,
  CaseStage.KYP_DETAILED_PENDING,
  CaseStage.KYP_DETAILED_COMPLETE,
  CaseStage.KYP_PENDING,
  CaseStage.KYP_COMPLETE,
  CaseStage.HOSPITALS_SUGGESTED,
]

function getPriorityTier(lead: LeadWithStage): 0 | 1 | 2 {
  if (lead.caseStage === CaseStage.DISCHARGED && !lead.dischargeSheet) return 1 // highest urgency
  if (lead.caseStage === CaseStage.PREAUTH_COMPLETE && !lead.insuranceInitiateForm) return 2
  return 0
}

export default function InsuranceDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('kyp-review')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: leads, isLoading, error } = useQuery<LeadWithStage[]>({
    queryKey: ['leads', 'insurance'],
    queryFn: async () => {
      try {
        const data = await apiGet<LeadWithStage[]>('/api/leads')
        return data || []
      } catch (err) {
        console.error('Error fetching leads:', err)
        return []
      }
    },
    enabled: true,
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!leads) return { kypReview: 0, preAuthRaised: 0, preAuthComplete: 0, admitted: 0, dischargePending: 0, ipdDone: 0, allPatients: 0, ipdScheduled: 0 }
    return {
      kypReview: leads.filter(l => KYP_STAGES.includes(l.caseStage) || (l.kypSubmission && l.caseStage === CaseStage.NEW_LEAD)).length,
      preAuthRaised: leads.filter(l => l.caseStage === CaseStage.PREAUTH_RAISED).length,
      preAuthComplete: leads.filter(l => l.caseStage === CaseStage.PREAUTH_COMPLETE).length,
      admitted: leads.filter(l => l.caseStage === CaseStage.INITIATED || l.caseStage === CaseStage.ADMITTED).length,
      dischargePending: leads.filter(l => l.caseStage === CaseStage.DISCHARGED && !l.dischargeSheet).length,
      ipdDone: leads.filter(l => l.caseStage === CaseStage.IPD_DONE).length,
      ipdScheduled: leads.filter(l => l.caseStage === CaseStage.INITIATED || l.caseStage === CaseStage.ADMITTED).length,
      allPatients: leads.length,
    }
  }, [leads])

  // ── IPD chart data ─────────────────────────────────────────────────────────
  const ipdChartData = useMemo(() => {
    if (!leads) return { daily: [], monthly: [] }
    const ipdLeads = leads.filter(l =>
      l.caseStage === CaseStage.IPD_DONE ||
      l.caseStage === CaseStage.INITIATED ||
      l.caseStage === CaseStage.ADMITTED ||
      l.caseStage === CaseStage.DISCHARGED
    )

    // Day-wise: last 14 days
    const dayMap = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dayMap.set(format(startOfDay(d), 'MMM d'), 0)
    }
    ipdLeads.forEach(l => {
      const date = l.updatedDate || l.createdDate
      if (!date) return
      const key = format(startOfDay(new Date(date)), 'MMM d')
      if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1)
    })
    const daily = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))

    // Month-wise: last 6 months
    const monthMap = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthMap.set(format(startOfMonth(d), 'MMM yy'), 0)
    }
    ipdLeads.forEach(l => {
      const date = l.updatedDate || l.createdDate
      if (!date) return
      const key = format(startOfMonth(new Date(date)), 'MMM yy')
      if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) || 0) + 1)
    })
    const monthly = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }))

    return { daily, monthly }
  }, [leads])

  // ── Filtered leads per tab ─────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    if (!leads) return []

    let result = leads.filter(lead => {
      switch (activeTab) {
        case 'kyp-review':
          return KYP_STAGES.includes(lead.caseStage) || (lead.kypSubmission && lead.caseStage === CaseStage.NEW_LEAD)
        case 'preauth-raised':
          return lead.caseStage === CaseStage.PREAUTH_RAISED
        case 'preauth-complete':
          return lead.caseStage === CaseStage.PREAUTH_COMPLETE
        case 'admitted':
          return lead.caseStage === CaseStage.INITIATED || lead.caseStage === CaseStage.ADMITTED
        case 'discharge-pending':
          return lead.caseStage === CaseStage.DISCHARGED && !lead.dischargeSheet
        case 'ipd-done':
          return lead.caseStage === CaseStage.IPD_DONE
        case 'all-patients':
          return true
        default:
          return false
      }
    })

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l =>
        l.patientName.toLowerCase().includes(q) ||
        l.leadRef.toLowerCase().includes(q) ||
        l.hospitalName.toLowerCase().includes(q) ||
        (l.treatment && l.treatment.toLowerCase().includes(q)) ||
        l.phoneNumber.toLowerCase().includes(q)
      )
    }

    // Priority sort: tier 1 > tier 2 > rest, then by date
    return result.sort((a, b) => {
      const tierA = getPriorityTier(a)
      const tierB = getPriorityTier(b)
      if (tierA !== tierB) return tierA - tierB // lower = more urgent
      const dateA = new Date(a.updatedDate || a.createdDate).getTime()
      const dateB = new Date(b.updatedDate || b.createdDate).getTime()
      return dateB - dateA
    })
  }, [leads, activeTab, searchQuery])

  // ── Components ─────────────────────────────────────────────────────────────
  const getStageBadge = (stage: CaseStage) => {
    const badgeConfig: Record<CaseStage, { className: string }> = {
      [CaseStage.NEW_LEAD]: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      [CaseStage.KYP_BASIC_PENDING]: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      [CaseStage.KYP_BASIC_COMPLETE]: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      [CaseStage.KYP_DETAILED_PENDING]: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
      [CaseStage.KYP_DETAILED_COMPLETE]: { className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      [CaseStage.KYP_PENDING]: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      [CaseStage.KYP_COMPLETE]: { className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      [CaseStage.HOSPITALS_SUGGESTED]: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      [CaseStage.PREAUTH_RAISED]: { className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      [CaseStage.PREAUTH_COMPLETE]: { className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
      [CaseStage.INITIATED]: { className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
      [CaseStage.ADMITTED]: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      [CaseStage.DISCHARGED]: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
      [CaseStage.IPD_DONE]: { className: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
      [CaseStage.PL_PENDING]: { className: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      [CaseStage.OUTSTANDING]: { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    }
    const config = badgeConfig[stage] || { className: 'bg-gray-100 text-gray-700' }
    return <Badge variant="secondary" className={config.className}>{stage.replace(/_/g, ' ')}</Badge>
  }

  const tabs: { id: TabKey; label: string; icon: React.FC<{ className?: string }>; value: number; gradient: string; bgGradient: string; iconColor: string; borderColor: string }[] = [
    { id: 'kyp-review', label: 'KYP Review', icon: FileText, value: stats.kypReview, gradient: 'from-blue-500 to-cyan-500', bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950', iconColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-200 dark:border-blue-800' },
    { id: 'preauth-raised', label: 'Pre-Auth Raised', icon: ArrowRight, value: stats.preAuthRaised, gradient: 'from-purple-500 to-pink-500', bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950', iconColor: 'text-purple-600 dark:text-purple-400', borderColor: 'border-purple-200 dark:border-purple-800' },
    { id: 'preauth-complete', label: 'Pre-Auth Complete', icon: CheckCircle2, value: stats.preAuthComplete, gradient: 'from-green-500 to-emerald-500', bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950', iconColor: 'text-green-600 dark:text-green-400', borderColor: 'border-green-200 dark:border-green-800' },
    { id: 'admitted', label: 'Admitted', icon: Activity, value: stats.admitted, gradient: 'from-indigo-500 to-blue-500', bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950', iconColor: 'text-indigo-600 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-800' },
    { id: 'discharge-pending', label: 'Discharge Pending', icon: Receipt, value: stats.dischargePending, gradient: 'from-orange-500 to-amber-500', bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950', iconColor: 'text-orange-600 dark:text-orange-400', borderColor: 'border-orange-200 dark:border-orange-800' },
    { id: 'ipd-done', label: 'IPD Done', icon: Shield, value: stats.ipdDone, gradient: 'from-teal-500 to-cyan-500', bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950', iconColor: 'text-teal-600 dark:text-teal-400', borderColor: 'border-teal-200 dark:border-teal-800' },
    { id: 'all-patients', label: 'All Patients', icon: LayoutList, value: stats.allPatients, gradient: 'from-slate-500 to-gray-500', bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950', iconColor: 'text-slate-600 dark:text-slate-400', borderColor: 'border-slate-200 dark:border-slate-800' },
  ]

  const tabLabels: Record<TabKey, string> = {
    'kyp-review': '📋 KYP Review Queue',
    'preauth-raised': '🚀 Pre-Auth Raised',
    'preauth-complete': '✅ Pre-Auth Complete',
    'admitted': '🏥 Admitted Patients',
    'discharge-pending': '📄 Discharge Pending',
    'ipd-done': '🛡️ IPD Done',
    'all-patients': '📊 All Patients',
  }

  const chartConfig = {
    count: { label: 'IPD Cases', color: 'hsl(var(--chart-1))' },
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* ── IPD Metrics Row ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick IPD counters */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 dark:border-teal-800 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total IPD Done</CardTitle>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20 text-teal-600 dark:text-teal-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">{stats.ipdDone}</div>
                  <p className="text-xs text-gray-500 mt-1">All time</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-indigo-200 dark:border-indigo-800 border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">IPD Scheduled</CardTitle>
                    <div className="p-2 rounded-lg bg-white/50 dark:bg-black/20 text-indigo-600 dark:text-indigo-400">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent">{stats.ipdScheduled}</div>
                  <p className="text-xs text-gray-500 mt-1">Currently admitted / initiated</p>
                </CardContent>
              </Card>
            </div>

            {/* Day-wise chart */}
            <Card className="border-2">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">IPD Activity – Last 14 Days</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <ChartContainer config={chartConfig} className="h-[110px] w-full">
                  <BarChart data={ipdChartData.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Month-wise chart */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">IPD Activity – Last 6 Months</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <ChartContainer config={{ count: { label: 'IPD Cases', color: 'hsl(var(--chart-2))' } }} className="h-[110px] w-full">
                <BarChart data={ipdChartData.monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* ── Stage Stat Cards (tab switchers) ────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {tabs.map((card) => {
              const Icon = card.icon
              const isActive = activeTab === card.id
              return (
                <Card
                  key={card.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                    isActive ? card.borderColor + ' shadow-lg ring-2 ring-offset-2' : 'border-transparent'
                  } bg-gradient-to-br ${card.bgGradient}`}
                  onClick={() => setActiveTab(card.id)}
                >
                  <CardHeader className="pb-1 pt-3 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                        {card.label}
                      </CardTitle>
                      <div className={`p-1.5 rounded-lg bg-white/50 dark:bg-black/20 ${card.iconColor}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* ── Work Queue Table ─────────────────────────────────────────── */}
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {tabLabels[activeTab]}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredLeads.length}</span> case{filteredLeads.length !== 1 ? 's' : ''}
                    {activeTab === 'all-patients' && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                        · Urgent cases highlighted on top
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search patient, ref, hospital..."
                    className="pl-8 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    <span className="text-lg">Loading cases...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="inline-flex flex-col items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300 font-semibold">
                      Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
                    </span>
                  </div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex flex-col items-center gap-2 p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <Clock className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300 font-semibold text-lg">No cases found</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-900">
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Lead Ref</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Patient</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Hospital</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Treatment</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Stage</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Last Modified</TableHead>
                        <TableHead className="font-bold text-gray-700 dark:text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead, index) => {
                        const tier = getPriorityTier(lead)
                        const isDischargeUrgent = tier === 1
                        const isInitialFormUrgent = tier === 2

                        const rowBg = isDischargeUrgent
                          ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : isInitialFormUrgent
                          ? 'bg-purple-50/60 dark:bg-purple-950/20'
                          : index % 2 === 0
                          ? 'bg-white dark:bg-gray-950'
                          : 'bg-gray-50/50 dark:bg-gray-900/50'

                        const borderLeft = isDischargeUrgent
                          ? 'border-l-4 border-l-orange-500'
                          : isInitialFormUrgent
                          ? 'border-l-4 border-l-purple-500'
                          : 'border-l-4 border-l-transparent'

                        return (
                          <TableRow
                            key={lead.id}
                            className={`transition-colors cursor-pointer hover:brightness-95 ${rowBg} ${borderLeft}`}
                            onClick={() => router.push(`/patient/${lead.id}`)}
                          >
                            <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                              <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-mono">
                                {lead.leadRef}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                  {lead.patientName}
                                  {isDischargeUrgent && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Discharge
                                    </span>
                                  )}
                                  {isInitialFormUrgent && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Fill Initial Form
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{getPhoneDisplay(lead.phoneNumber, canViewPhoneNumber(user))}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{lead.hospitalName}</TableCell>
                            <TableCell className="text-gray-700 dark:text-gray-300">{lead.treatment || <span className="text-gray-400">-</span>}</TableCell>
                            <TableCell>{getStageBadge(lead.caseStage)}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {lead.updatedDate || lead.createdDate
                                ? format(new Date(lead.updatedDate || lead.createdDate), 'MMM dd, HH:mm')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                {lead.caseStage === CaseStage.PREAUTH_RAISED && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); router.push(`/patient/${lead.id}/pre-auth`) }}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Complete Pre-Auth
                                  </Button>
                                )}
                                {lead.caseStage === CaseStage.PREAUTH_COMPLETE && !lead.insuranceInitiateForm && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); router.push(`/patient/${lead.id}/pre-auth`) }}
                                    className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md"
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    Fill Initial Form
                                  </Button>
                                )}
                                {lead.caseStage === CaseStage.DISCHARGED && !lead.dischargeSheet && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); router.push(`/patient/${lead.id}/discharge`) }}
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                                  >
                                    <Receipt className="w-4 h-4 mr-1" />
                                    Fill Discharge
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
