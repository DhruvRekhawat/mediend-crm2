'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KYPForm } from '@/components/kyp/kyp-form'
import { FollowUpForm } from '@/components/kyp/follow-up-form'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Eye, Plus } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'

interface KYPSubmission {
  id: string
  leadId: string
  aadhar: string | null
  pan: string | null
  insuranceCard: string | null
  disease: string | null
  location: string | null
  remark: string | null
  status: 'PENDING' | 'PRE_AUTH_COMPLETE' | 'FOLLOW_UP_COMPLETE' | 'COMPLETED'
  submittedAt: string
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
  }
  preAuthData: {
    id: string
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    hospitalNameSuggestion: string | null
    insurance: string | null
    tpa: string | null
    handledAt: string
  } | null
  followUpData: {
    id: string
    admissionDate: string | null
    surgeryDate: string | null
    prescription: string | null
    report: string | null
    hospitalName: string | null
    doctorName: string | null
    prescriptionFileUrl: string | null
    reportFileUrl: string | null
    updatedAt: string
    updatedBy: {
      id: string
      name: string
    } | null
  } | null
}

export default function KYPPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedKYP, setSelectedKYP] = useState<KYPSubmission | null>(null)
  const [showKYPForm, setShowKYPForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'preauth' | 'followup' | null>(null)

  const { data: kypSubmissions, isLoading } = useQuery<KYPSubmission[]>({
    queryKey: ['kyp-submissions', user?.id],
    queryFn: () => apiGet<KYPSubmission[]>('/api/kyp'),
  })

  const { leads } = useLeads({ bdId: user?.id })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      PRE_AUTH_COMPLETE: 'default',
      FOLLOW_UP_COMPLETE: 'default',
      COMPLETED: 'default',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Know Your Patient (KYP)</h1>
              <p className="text-muted-foreground mt-1">Manage KYP submissions and follow-ups</p>
            </div>
            <Button onClick={() => setShowKYPForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New KYP Submission
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>KYP Submissions</CardTitle>
              <CardDescription>All your KYP submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Ref</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Disease</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kypSubmissions && kypSubmissions.length > 0 ? (
                      kypSubmissions.map((kyp) => (
                        <TableRow key={kyp.id}>
                          <TableCell className="font-medium">{kyp.lead.leadRef}</TableCell>
                          <TableCell>{kyp.lead.patientName}</TableCell>
                          <TableCell>{kyp.location || kyp.lead.city}</TableCell>
                          <TableCell>{kyp.disease || '-'}</TableCell>
                          <TableCell>{getStatusBadge(kyp.status)}</TableCell>
                          <TableCell>
                            {format(new Date(kyp.submittedAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedKYP(kyp)
                                  // BD can view pre-auth details (read-only) or follow-up
                                  if (kyp.status === 'PENDING' || (kyp.preAuthData && !kyp.followUpData)) {
                                    setViewMode('preauth')
                                  } else if (kyp.status === 'PRE_AUTH_COMPLETE' || kyp.status === 'FOLLOW_UP_COMPLETE' || kyp.followUpData) {
                                    setViewMode('followup')
                                  } else {
                                    setViewMode(null)
                                  }
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              {kyp.status === 'PRE_AUTH_COMPLETE' && !kyp.followUpData && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedKYP(kyp)
                                    setViewMode('followup')
                                  }}
                                >
                                  Add Follow-Up
                                </Button>
                              )}
                              {kyp.followUpData && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedKYP(kyp)
                                    setViewMode('followup')
                                  }}
                                >
                                  View Follow-Up
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No KYP submissions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* KYP Form Dialog */}
          <Dialog open={showKYPForm} onOpenChange={setShowKYPForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New KYP Submission</DialogTitle>
                <DialogDescription>Select a lead to submit KYP</DialogDescription>
              </DialogHeader>
              {!selectedLeadId ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {leads.map((lead) => (
                    <Button
                      key={lead.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      {lead.leadRef} - {lead.patientName}
                    </Button>
                  ))}
                </div>
              ) : (
                <KYPForm
                  leadId={selectedLeadId}
                  onSuccess={() => {
                    setShowKYPForm(false)
                    setSelectedLeadId(null)
                  }}
                  onCancel={() => {
                    setShowKYPForm(false)
                    setSelectedLeadId(null)
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* View/Edit Dialog */}
          {selectedKYP && (
            <Dialog
              open={!!selectedKYP}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedKYP(null)
                  setViewMode(null)
                }
              }}
            >
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {viewMode === 'preauth'
                      ? 'Pre-Authorization'
                      : viewMode === 'followup'
                        ? 'Patient Follow-Up'
                        : 'KYP Details'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedKYP.lead.leadRef} - {selectedKYP.lead.patientName}
                  </DialogDescription>
                </DialogHeader>
                {viewMode === 'preauth' && (
                  <div className="space-y-4">
                    {selectedKYP.preAuthData ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Sum Insured</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.sumInsured || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>Room Rent</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.roomRent || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>Capping</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.capping || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>Copay</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.copay || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>ICU</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.icu || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>Hospital Name Suggestion</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.hospitalNameSuggestion || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>Insurance</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.insurance || '-'}
                          </p>
                        </div>
                        <div>
                          <Label>TPA</Label>
                          <p className="text-sm font-medium mt-1">
                            {selectedKYP.preAuthData.tpa || '-'}
                          </p>
                        </div>
                        {selectedKYP.preAuthData.handledAt && (
                          <div>
                            <Label>Pre-Authorized At</Label>
                            <p className="text-sm font-medium mt-1">
                              {format(new Date(selectedKYP.preAuthData.handledAt), 'PPpp')}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Pre-authorization details not yet filled by Insurance team
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedKYP(null)
                          setViewMode(null)
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
                {viewMode === 'followup' && (
                  <>
                    {selectedKYP.status === 'PRE_AUTH_COMPLETE' && !selectedKYP.followUpData ? (
                      <FollowUpForm
                        kypSubmissionId={selectedKYP.id}
                        initialData={selectedKYP.followUpData || undefined}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['kyp-submissions'] })
                          setSelectedKYP(null)
                          setViewMode(null)
                        }}
                        onCancel={() => {
                          setSelectedKYP(null)
                          setViewMode(null)
                        }}
                      />
                    ) : selectedKYP.followUpData ? (
                      <FollowUpDetailsView followUpData={selectedKYP.followUpData as any} />
                    ) : null}
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
