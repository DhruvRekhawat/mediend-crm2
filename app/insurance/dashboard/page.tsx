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
import { PreAuthApprovalModal } from '@/components/kyp/pre-auth-approval-modal'
import { PreAuthStatus } from '@prisma/client'

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
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'kyp-review' | 'preauth-raised' | 'preauth-complete' | 'admitted' | 'discharge-pending' | 'ipd-done'>('kyp-review')
  const [selectedLead, setSelectedLead] = useState<LeadWithStage | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  // Filter leads by stage
  const filteredLeads = leads?.filter((lead) => {
    // Debug: log lead details for troubleshooting
    if (lead.kypSubmission && !lead.caseStage) {
      console.warn('Lead has KYP submission but no caseStage:', lead.leadRef, lead)
    }
    
    switch (activeTab) {
      case 'kyp-review':
        // Include leads with KYP_PENDING or KYP_COMPLETE, or leads with KYP submission but caseStage not set
        return lead.caseStage === CaseStage.KYP_COMPLETE || 
               lead.caseStage === CaseStage.KYP_PENDING ||
               (lead.kypSubmission && (!lead.caseStage || lead.caseStage === CaseStage.NEW_LEAD))
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
    const kypReview = leads?.filter(l => 
      l.caseStage === CaseStage.KYP_COMPLETE || 
      l.caseStage === CaseStage.KYP_PENDING ||
      (l.kypSubmission && (!l.caseStage || l.caseStage === CaseStage.NEW_LEAD))
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
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  Error loading leads: {error instanceof Error ? error.message : 'Unknown error'}
                </div>
              ) : !leads || leads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leads found. Make sure KYP has been submitted for at least one lead.
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cases found in this queue. Total leads available: {leads.length}
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
                          <div className="flex gap-2">
                            {lead.caseStage === CaseStage.PREAUTH_RAISED && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead)
                                  setIsModalOpen(true)
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Complete Pre-Auth
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/patient/${lead.id}`)}
                            >
                              View
                            </Button>
                          </div>
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

      {/* Pre-Auth Approval Modal */}
      {selectedLead && selectedLead.kypSubmission && selectedLead.kypSubmission.preAuthData && (
        <PreAuthApprovalModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open)
            if (!open) {
              setSelectedLead(null)
            }
          }}
          leadId={selectedLead.id}
          leadRef={selectedLead.leadRef}
          patientName={selectedLead.patientName}
          kypSubmissionId={selectedLead.kypSubmission.id}
          preAuthData={selectedLead.kypSubmission.preAuthData}
        />
      )}
    </ProtectedRoute>
  )
}


