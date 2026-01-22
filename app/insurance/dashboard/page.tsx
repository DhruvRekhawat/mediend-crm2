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
import { useState } from 'react'
import { FileText, AlertCircle, CheckCircle2, Clock, ArrowRight, Receipt } from 'lucide-react'

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
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
    preAuthData?: {
      id: string
      requestedHospitalName?: string | null
      diseaseDescription?: string | null
      preAuthRaisedAt?: string | null
      sumInsured?: string | null
      handledAt?: string | null
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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'kyp-review' | 'preauth-raised' | 'preauth-complete' | 'admitted' | 'discharge-pending' | 'ipd-done'>('kyp-review')

  const { data: leads, isLoading } = useQuery<LeadWithStage[]>({
    queryKey: ['leads', 'insurance', activeTab],
    queryFn: () => apiGet<LeadWithStage[]>('/api/leads'),
    enabled: true,
  })

  // Filter leads by stage
  const filteredLeads = leads?.filter((lead) => {
    switch (activeTab) {
      case 'kyp-review':
        return lead.caseStage === CaseStage.KYP_COMPLETE || lead.caseStage === CaseStage.KYP_PENDING
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
  }) || []

  const getTabStats = () => {
    const kypReview = leads?.filter(l => l.caseStage === CaseStage.KYP_COMPLETE || l.caseStage === CaseStage.KYP_PENDING).length || 0
    const preAuthRaised = leads?.filter(l => l.caseStage === CaseStage.PREAUTH_RAISED).length || 0
    const preAuthComplete = leads?.filter(l => l.caseStage === CaseStage.PREAUTH_COMPLETE).length || 0
    const admitted = leads?.filter(l => l.caseStage === CaseStage.INITIATED || l.caseStage === CaseStage.ADMITTED).length || 0
    const dischargePending = leads?.filter(l => l.caseStage === CaseStage.DISCHARGED && !l.dischargeSheet).length || 0
    const ipdDone = leads?.filter(l => l.caseStage === CaseStage.IPD_DONE).length || 0

    return { kypReview, preAuthRaised, preAuthComplete, admitted, dischargePending, ipdDone }
  }

  const stats = getTabStats()

  const getStageBadge = (stage: CaseStage) => {
    const variants: Record<CaseStage, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [CaseStage.NEW_LEAD]: 'secondary',
      [CaseStage.KYP_PENDING]: 'secondary',
      [CaseStage.KYP_COMPLETE]: 'default',
      [CaseStage.PREAUTH_RAISED]: 'default',
      [CaseStage.PREAUTH_COMPLETE]: 'default',
      [CaseStage.INITIATED]: 'default',
      [CaseStage.ADMITTED]: 'default',
      [CaseStage.DISCHARGED]: 'outline',
      [CaseStage.IPD_DONE]: 'default',
      [CaseStage.PL_PENDING]: 'secondary',
      [CaseStage.OUTSTANDING]: 'secondary',
    }
    return (
      <Badge variant={variants[stage] || 'secondary'}>
        {stage.replace(/_/g, ' ')}
      </Badge>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Insurance Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage cases by workflow stage</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('kyp-review')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">KYP Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.kypReview}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('preauth-raised')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pre-Auth Raised</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.preAuthRaised}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('preauth-complete')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pre-Auth Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.preAuthComplete}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('admitted')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Admitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.admitted}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('discharge-pending')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Discharge Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.dischargePending}</div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('ipd-done')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">IPD Done</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.ipdDone}</div>
              </CardContent>
            </Card>
          </div>

          {/* Work Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {activeTab === 'kyp-review' && 'KYP Review Queue'}
                    {activeTab === 'preauth-raised' && 'Pre-Auth Raised'}
                    {activeTab === 'preauth-complete' && 'Pre-Auth Complete'}
                    {activeTab === 'admitted' && 'Admitted Patients'}
                    {activeTab === 'discharge-pending' && 'Discharge Pending'}
                    {activeTab === 'ipd-done' && 'IPD Done'}
                  </CardTitle>
                  <CardDescription>
                    {filteredLeads.length} case{filteredLeads.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={activeTab === 'kyp-review' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('kyp-review')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    KYP Review
                  </Button>
                  <Button
                    variant={activeTab === 'preauth-raised' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('preauth-raised')}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Pre-Auth Raised
                  </Button>
                  <Button
                    variant={activeTab === 'preauth-complete' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('preauth-complete')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                  <Button
                    variant={activeTab === 'admitted' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('admitted')}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Admitted
                  </Button>
                  <Button
                    variant={activeTab === 'discharge-pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('discharge-pending')}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Discharge
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cases found in this queue
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Ref</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.leadRef}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.patientName}</div>
                            <div className="text-sm text-muted-foreground">{lead.phoneNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>{lead.hospitalName}</TableCell>
                        <TableCell>{lead.treatment || '-'}</TableCell>
                        <TableCell>{getStageBadge(lead.caseStage)}</TableCell>
                        <TableCell>
                          {lead.createdDate
                            ? format(new Date(lead.createdDate), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/patient/${lead.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}


