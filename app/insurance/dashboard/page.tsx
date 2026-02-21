'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { CaseStage } from '@prisma/client'
import { useState, useMemo } from 'react'
import { FileText, AlertCircle, CheckCircle2, Clock, ArrowRight, Receipt, Shield, Activity, TrendingUp, Search } from 'lucide-react'
import { PreAuthStatus } from '@prisma/client'
import { useAuth } from '@/hooks/use-auth'
import { canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'
import { Input } from '@/components/ui/input'

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
      handledBy?: {
        id: string
        name: string
      } | null
      preAuthRaisedBy?: {
        id: string
        name: string
      } | null
    } | null
  } | null
  admissionRecord?: {
    id: string
    admissionDate: string
    admittingHospital: string
  } | null
  dischargeSheet?: {
    id: string
  } | null
}

export default function InsuranceDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'kyp-review' | 'preauth-raised' | 'preauth-complete' | 'admitted' | 'discharge-pending' | 'ipd-done'>('kyp-review')
  const [searchQuery, setSearchQuery] = useState('')

  const KYP_STAGES: CaseStage[] = [
    CaseStage.KYP_BASIC_PENDING,
    CaseStage.KYP_BASIC_COMPLETE,
    CaseStage.KYP_DETAILED_PENDING,
    CaseStage.KYP_DETAILED_COMPLETE,
    CaseStage.KYP_PENDING,
    CaseStage.KYP_COMPLETE,
  ]
  

  const { data: leads, isLoading, error } = useQuery<LeadWithStage[]>({
    queryKey: ['leads', 'insurance', activeTab],
    queryFn: async () => {
      try {
        const data = await apiGet<LeadWithStage[]>('/api/leads')
        console.log('Insurance Dashboard - Fetched leads:', data?.length || 0)
        console.log('Sample lead:', data?.[0])
        console.log('Leads with caseStage:', data?.filter(l => l.caseStage).length || 0)
        console.log('Leads with KYP:', data?.filter(l => l.kypSubmission).length || 0)
        return data || []
      } catch (err) {
        console.error('Error fetching leads:', err)
        return []
      }
    },
    enabled: true,
  })

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    if (!leads) return []

    // 1. Filter by Tab
    let result = leads.filter((lead) => {
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
        default:
          return false
      }
    })

    // 2. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((lead) => 
        lead.patientName.toLowerCase().includes(query) ||
        lead.leadRef.toLowerCase().includes(query) ||
        lead.hospitalName.toLowerCase().includes(query) ||
        (lead.treatment && lead.treatment.toLowerCase().includes(query)) ||
        lead.phoneNumber.toLowerCase().includes(query)
      )
    }

    // 3. Sort by last modified (updatedDate)
    return result.sort((a, b) => {
      const dateA = new Date(a.updatedDate || a.createdDate).getTime()
      const dateB = new Date(b.updatedDate || b.createdDate).getTime()
      return dateB - dateA
    })
  }, [leads, activeTab, searchQuery])

  const getTabStats = () => {
    const kypReview = leads?.filter(l =>
      KYP_STAGES.includes(l.caseStage) ||
      (l.kypSubmission && l.caseStage === CaseStage.NEW_LEAD)
    ).length || 0
    
    const preAuthRaised = leads?.filter(l => l.caseStage === CaseStage.PREAUTH_RAISED).length || 0
    const preAuthComplete = leads?.filter(l => l.caseStage === CaseStage.PREAUTH_COMPLETE).length || 0
    const admitted = leads?.filter(l => l.caseStage === CaseStage.INITIATED || l.caseStage === CaseStage.ADMITTED).length || 0
    const dischargePending = leads?.filter(l => l.caseStage === CaseStage.DISCHARGED && !l.dischargeSheet).length || 0
    const ipdDone = leads?.filter(l => l.caseStage === CaseStage.IPD_DONE).length || 0

    return { kypReview, preAuthRaised, preAuthComplete, admitted, dischargePending, ipdDone }
  }

  const stats = getTabStats()

  const getStageBadge = (stage: CaseStage) => {
    const badgeConfig: Record<CaseStage, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      [CaseStage.NEW_LEAD]: { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      [CaseStage.KYP_BASIC_PENDING]: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      [CaseStage.KYP_BASIC_COMPLETE]: { variant: 'default', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      [CaseStage.KYP_DETAILED_PENDING]: { variant: 'secondary', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
      [CaseStage.KYP_DETAILED_COMPLETE]: { variant: 'default', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      [CaseStage.KYP_PENDING]: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
      [CaseStage.KYP_COMPLETE]: { variant: 'default', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      [CaseStage.HOSPITALS_SUGGESTED]: { variant: 'default', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      [CaseStage.PREAUTH_RAISED]: { variant: 'default', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      [CaseStage.PREAUTH_COMPLETE]: { variant: 'default', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
      [CaseStage.INITIATED]: { variant: 'default', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
      [CaseStage.ADMITTED]: { variant: 'default', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
      [CaseStage.DISCHARGED]: { variant: 'outline', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300' },
      [CaseStage.IPD_DONE]: { variant: 'default', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
      [CaseStage.PL_PENDING]: { variant: 'secondary', className: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300' },
      [CaseStage.OUTSTANDING]: { variant: 'secondary', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    }
    const config = badgeConfig[stage] || { variant: 'secondary', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' }
    return (
      <Badge variant={config.variant} className={config.className}>
        {stage.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const statCards = [
    {
      id: 'kyp-review',
      title: 'KYP Review',
      value: stats.kypReview,
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      id: 'preauth-raised',
      title: 'Pre-Auth Raised',
      value: stats.preAuthRaised,
      icon: ArrowRight,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    {
      id: 'preauth-complete',
      title: 'Pre-Auth Complete',
      value: stats.preAuthComplete,
      icon: CheckCircle2,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      id: 'admitted',
      title: 'Admitted',
      value: stats.admitted,
      icon: Activity,
      gradient: 'from-indigo-500 to-blue-500',
      bgGradient: 'from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
    },
    {
      id: 'discharge-pending',
      title: 'Discharge Pending',
      value: stats.dischargePending,
      icon: Receipt,
      gradient: 'from-orange-500 to-amber-500',
      bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
    {
      id: 'ipd-done',
      title: 'IPD Done',
      value: stats.ipdDone,
      icon: Shield,
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950',
      iconColor: 'text-teal-600 dark:text-teal-400',
      borderColor: 'border-teal-200 dark:border-teal-800',
    },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-7xl space-y-6">


          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon
              const isActive = activeTab === card.id
              return (
                <Card
                  key={card.id}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 ${
                    isActive ? card.borderColor + ' shadow-lg ring-2 ring-offset-2' : 'border-transparent'
                  } bg-gradient-to-br ${card.bgGradient}`}
                  onClick={() => setActiveTab(card.id as any)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {card.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${card.iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                      {card.value}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Work Queue */}
          <Card className="border-2 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                    {activeTab === 'kyp-review' && '📋 KYP Review Queue'}
                    {activeTab === 'preauth-raised' && '🚀 Pre-Auth Raised'}
                    {activeTab === 'preauth-complete' && '✅ Pre-Auth Complete'}
                    {activeTab === 'admitted' && '🏥 Admitted Patients'}
                    {activeTab === 'discharge-pending' && '📄 Discharge Pending'}
                    {activeTab === 'ipd-done' && '🛡️ IPD Done'}
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredLeads.length}</span> case{filteredLeads.length !== 1 ? 's' : ''} in queue
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search patient, ref, hospital..."
                      className="pl-8 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button
                    variant={activeTab === 'kyp-review' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('kyp-review')}
                    className={activeTab === 'kyp-review' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 shadow-md' : 'hover:bg-blue-50 dark:hover:bg-blue-950'}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    KYP Review
                  </Button>
                  <Button
                    variant={activeTab === 'preauth-raised' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('preauth-raised')}
                    className={activeTab === 'preauth-raised' ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-md' : 'hover:bg-purple-50 dark:hover:bg-purple-950'}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Pre-Auth Raised
                  </Button>
                  <Button
                    variant={activeTab === 'preauth-complete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('preauth-complete')}
                    className={activeTab === 'preauth-complete' ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-md' : 'hover:bg-green-50 dark:hover:bg-green-950'}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                  <Button
                    variant={activeTab === 'admitted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('admitted')}
                    className={activeTab === 'admitted' ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white border-0 shadow-md' : 'hover:bg-indigo-50 dark:hover:bg-indigo-950'}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Admitted
                  </Button>
                  <Button
                    variant={activeTab === 'discharge-pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('discharge-pending')}
                    className={activeTab === 'discharge-pending' ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-md' : 'hover:bg-orange-50 dark:hover:bg-orange-950'}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Discharge
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
              ) : !leads || leads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex flex-col items-center gap-2 p-6 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <FileText className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-lg">
                      No leads found
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 text-sm">
                      Make sure KYP has been submitted for at least one lead.
                    </span>
                  </div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex flex-col items-center gap-2 p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <Clock className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300 font-semibold text-lg">
                      No cases found in this queue
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      Total leads available: {leads.length}
                    </span>
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
                      {filteredLeads.map((lead, index) => (
                        <TableRow 
                          key={lead.id}
                          className={`transition-colors cursor-pointer hover:bg-gradient-to-r ${
                            index % 2 === 0 
                              ? 'bg-white dark:bg-gray-950 hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20' 
                              : 'bg-gray-50/50 dark:bg-gray-900/50 hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/20 dark:hover:to-pink-950/20'
                          } border-l-4 border-transparent hover:border-blue-400 dark:hover:border-blue-600`}
                          onClick={() => router.push(`/patient/${lead.id}`)}
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-mono">
                              {lead.leadRef}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{lead.patientName}</div>
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
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/patient/${lead.id}/pre-auth`)
                                  }}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Complete Pre-Auth
                                </Button>
                              )}
                              {lead.caseStage === CaseStage.PREAUTH_COMPLETE && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/patient/${lead.id}`)
                                  }}
                                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Fill Initial Form
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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


