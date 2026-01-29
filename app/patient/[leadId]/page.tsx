'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, MessageSquare, ClipboardList, Receipt, Plus, FileDown, CheckCircle2 } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { KYPDetailsView } from '@/components/kyp/kyp-details-view'
import { PreAuthDetailsView } from '@/components/kyp/pre-auth-details-view'
import { PreAuthForm } from '@/components/kyp/pre-auth-form'
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'
import { KYPForm } from '@/components/kyp/kyp-form'
import { StageProgress } from '@/components/case/stage-progress'
import { ActivityTimeline } from '@/components/case/activity-timeline'
import { format } from 'date-fns'
import Link from 'next/link'
import { CaseStage } from '@prisma/client'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { 
  canAddKYPDetails, 
  canCompletePreAuth, 
  canRaisePreAuth, 
  canEditKYP,
  canInitiate,
  canMarkDischarge,
  canGeneratePDF,
  canEditDischargeSheet
} from '@/lib/case-permissions'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'

interface Lead {
  id: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  hospitalName: string
  treatment: string | null
  category: string | null
  status: string
  pipelineStage: string
  caseStage: CaseStage
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
    submittedBy: {
      id: string
      name: string
    }
    preAuthData?: {
      id: string
      sumInsured: string | null
      roomRent: string | null
      capping: string | null
      copay: string | null
      icu: string | null
      hospitalNameSuggestion: string | null
      hospitalSuggestions?: string[] | null
      roomTypes?: Array<{ name: string; rent: string }> | null
      insurance: string | null
      tpa: string | null
      requestedHospitalName?: string | null
      requestedRoomType?: string | null
      diseaseDescription?: string | null
      diseaseImages?: Array<{ name: string; url: string }> | null
      preAuthRaisedAt?: string | null
      handledAt?: string | null
      handledBy?: {
        id: string
        name: string
      } | null
      preAuthRaisedBy?: {
        id: string
        name: string
      } | null
    } | null
    followUpData?: {
      id: string
    } | null
  } | null
  dischargeSheet?: {
    id: string
  } | null
}

interface KYPSubmission {
  id: string
  leadId: string
  aadhar: string | null
  pan: string | null
  insuranceCard: string | null
  disease: string | null
  location: string | null
  remark: string | null
  aadharFileUrl: string | null
  panFileUrl: string | null
  insuranceCardFileUrl: string | null
  otherFiles: Array<{ name: string; url: string }> | null
  status: 'PENDING' | 'KYP_DETAILS_ADDED' | 'PRE_AUTH_COMPLETE' | 'FOLLOW_UP_COMPLETE' | 'COMPLETED'
  submittedAt: string
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
  }
  submittedBy: {
    id: string
    name: string
  }
  preAuthData?: {
    id: string
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    hospitalNameSuggestion: string | null
    hospitalSuggestions?: string[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    insurance: string | null
    tpa: string | null
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
    preAuthRaisedAt?: string | null
    handledAt?: string | null
    handledBy?: {
      id: string
      name: string
    } | null
    preAuthRaisedBy?: {
      id: string
      name: string
    } | null
  } | null
  followUpData?: {
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

export default function PatientDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const leadId = params.leadId as string

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const { data: kypSubmission, isLoading: isLoadingKYP } = useQuery<KYPSubmission | null>({
    queryKey: ['kyp-submission', leadId],
    queryFn: async () => {
      const submissions = await apiGet<KYPSubmission[]>('/api/kyp')
      return submissions.find((s) => s.leadId === leadId) || null
    },
    enabled: !!leadId && !!lead?.kypSubmission,
  })

  const { data: stageHistory } = useQuery<any[]>({
    queryKey: ['stage-history', leadId],
    queryFn: () => apiGet<any[]>(`/api/leads/${leadId}/stage-history`),
    enabled: !!leadId,
  })

  const [showKYPForm, setShowKYPForm] = useState(false)
  const [showPreAuthRaiseForm, setShowPreAuthRaiseForm] = useState(false)
  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [admitSubmitting, setAdmitSubmitting] = useState(false)
  const [admitForm, setAdmitForm] = useState({
    admissionDate: '',
    admissionTime: '',
    admittingHospital: '',
    expectedSurgeryDate: '',
    notes: '',
  })
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false)
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false)

  if (isLoading || isLoadingKYP) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading patient details...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!lead) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Patient not found</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      KYP_DETAILS_ADDED: 'default',
      PRE_AUTH_COMPLETE: 'default',
      FOLLOW_UP_COMPLETE: 'default',
      COMPLETED: 'default',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {getKYPStatusLabel(status)}
      </Badge>
    )
  }

  // Permission checks
  const canRaise = user && canRaisePreAuth(user, lead)
  const canAddDetails = user && canAddKYPDetails(user, lead)
  const canComplete = user && canCompletePreAuth(user, lead)
  const canEdit = user && canEditKYP(user, lead)
  const canInit = user && canInitiate(user, lead)
  const canDischarge = user && canMarkDischarge(user, lead)
  const canPDF = user && canGeneratePDF(user, lead)
  const canFillDischargeForm = user && canEditDischargeSheet(user, lead)

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{lead.patientName}</h1>
              <p className="text-muted-foreground">
                {lead.leadRef} • {lead.hospitalName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{lead.pipelineStage}</Badge>
            <Badge variant="secondary">{lead.status}</Badge>
          </div>
        </div>

        {/* Stage Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Case Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <StageProgress currentStage={lead.caseStage} />
          </CardContent>
        </Card>

        {/* Patient Info Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{lead.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{lead.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Treatment</p>
                <p className="font-medium">{lead.treatment || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{lead.category || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Section */}
        {user && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Available actions based on case stage and your role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {/* BD Actions */}
                {!lead.kypSubmission && (user.role === 'BD' || user.role === 'ADMIN') && (
                  <Button
                    onClick={() => setShowKYPForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Start KYP
                  </Button>
                )}
                {canRaise && (
                  <Button
                    onClick={() => setShowPreAuthRaiseForm(true)}
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Raise Pre-Auth
                  </Button>
                )}
                {canInit && (
                  <Button
                    variant="default"
                    className="flex items-center gap-2"
                    onClick={() => {
                      setAdmitForm({
                        admissionDate: new Date().toISOString().slice(0, 10),
                        admissionTime: '',
                        admittingHospital: lead.hospitalName || '',
                        expectedSurgeryDate: '',
                        notes: '',
                      })
                      setShowAdmitModal(true)
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Admitted
                  </Button>
                )}
                {canDischarge && (
                  <Button
                    variant="default"
                    className="flex items-center gap-2"
                    onClick={() => setShowDischargeConfirm(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Discharged
                  </Button>
                )}
                
                {/* Insurance Actions */}
                {canAddDetails && (
                  <Button
                    asChild
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <Plus className="h-4 w-4" />
                      Add KYP Details
                    </Link>
                  </Button>
                )}
                {canComplete && (
                  <Button
                    asChild
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete Pre-Auth
                    </Link>
                  </Button>
                )}
                {canPDF && (
                  <Button
                    asChild
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <FileDown className="h-4 w-4" />
                      Generate PDF
                    </Link>
                  </Button>
                )}
                {canFillDischargeForm && (
                  <Button
                    asChild
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <Link href={`/patient/${leadId}/discharge`}>
                      <Receipt className="h-4 w-4" />
                      {lead.dischargeSheet ? 'View / Edit Discharge Sheet' : 'Fill Discharge Form'}
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="kyp" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kyp" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              KYP
              {lead.kypSubmission && (
                <Badge variant="secondary" className="ml-1">
                  {getKYPStatusLabel(lead.kypSubmission.status)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pre-auth" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Pre-Auth
              {lead.caseStage === CaseStage.PREAUTH_COMPLETE && (
                <Badge variant="secondary" className="ml-1">Complete</Badge>
              )}
            </TabsTrigger>
            {lead.kypSubmission?.followUpData && (
              <TabsTrigger value="follow-up" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Follow-Up
              </TabsTrigger>
            )}
            {lead.dischargeSheet && (
              <TabsTrigger value="discharge" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Discharge Sheet
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="kyp">
            {showKYPForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submit KYP</CardTitle>
                  <CardDescription>Enter patient KYP details</CardDescription>
                </CardHeader>
                <CardContent>
                  <KYPForm
                    leadId={leadId}
                    onSuccess={() => {
                      setShowKYPForm(false)
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                    }}
                    onCancel={() => setShowKYPForm(false)}
                  />
                </CardContent>
              </Card>
            ) : kypSubmission ? (
              <KYPDetailsView kypSubmission={kypSubmission} />
            ) : canEdit ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No KYP submission found</p>
                  <Button onClick={() => setShowKYPForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start KYP
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No KYP submission found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pre-auth">
            {showPreAuthRaiseForm && kypSubmission ? (
              <Card>
                <CardHeader>
                  <CardTitle>Raise Pre-Auth</CardTitle>
                  <CardDescription>Select hospital and room type from Insurance suggestions</CardDescription>
                </CardHeader>
                <CardContent>
                  <PreAuthRaiseForm
                    leadId={leadId}
                    initialData={kypSubmission.preAuthData ? {
                      requestedHospitalName: kypSubmission.preAuthData.requestedHospitalName || undefined,
                      requestedRoomType: kypSubmission.preAuthData.requestedRoomType || undefined,
                      diseaseDescription: kypSubmission.preAuthData.diseaseDescription || undefined,
                      diseaseImages: kypSubmission.preAuthData.diseaseImages as Array<{ name: string; url: string }> | undefined,
                      hospitalSuggestions: kypSubmission.preAuthData.hospitalSuggestions ?? undefined,
                      roomTypes: kypSubmission.preAuthData.roomTypes ?? undefined,
                    } : undefined}
                    onSuccess={() => {
                      setShowPreAuthRaiseForm(false)
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                    }}
                    onCancel={() => setShowPreAuthRaiseForm(false)}
                  />
                </CardContent>
              </Card>
            ) : lead.kypSubmission?.preAuthData ? (
              <PreAuthDetailsView
                preAuthData={lead.kypSubmission.preAuthData}
                caseStage={lead.caseStage}
                leadRef={lead.leadRef}
                patientName={lead.patientName}
              />
            ) : canRaise ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No pre-auth request yet</p>
                  <Button onClick={() => setShowPreAuthRaiseForm(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Raise Pre-Auth
                  </Button>
                </CardContent>
              </Card>
            ) : canAddDetails ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Add KYP details (hospitals, room types, TPA)</p>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Add KYP Details →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : canComplete ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">BD has raised pre-auth. Review and complete.</p>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Complete Pre-Auth →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {lead.caseStage === CaseStage.PREAUTH_COMPLETE
                    ? 'Pre-authorization completed'
                    : 'Pre-authorization pending'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {lead.kypSubmission?.followUpData && kypSubmission?.followUpData && (
            <TabsContent value="follow-up">
              <FollowUpDetailsView followUpData={kypSubmission.followUpData} />
            </TabsContent>
          )}

          {lead.dischargeSheet && (
            <TabsContent value="discharge">
              <Link href={`/patient/${leadId}/discharge`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardHeader>
                    <CardTitle>Discharge Sheet</CardTitle>
                    <CardDescription>Patient discharge information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">View Details</Button>
                  </CardContent>
                </Card>
              </Link>
            </TabsContent>
          )}
        </Tabs>

        {/* Activity Timeline */}
        {stageHistory && <ActivityTimeline history={stageHistory} />}

        {/* Mark Admitted Modal */}
        <Dialog open={showAdmitModal} onOpenChange={setShowAdmitModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Admitted</DialogTitle>
              <DialogDescription>
                Record admission details. Insurance will be notified.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!admitForm.admissionDate || !admitForm.admittingHospital.trim()) {
                  toast.error('Admission date and hospital are required')
                  return
                }
                setAdmitSubmitting(true)
                try {
                  await apiPost(`/api/leads/${leadId}/initiate`, {
                    admissionDate: admitForm.admissionDate,
                    admissionTime: admitForm.admissionTime || undefined,
                    admittingHospital: admitForm.admittingHospital.trim(),
                    expectedSurgeryDate: admitForm.expectedSurgeryDate || undefined,
                    notes: admitForm.notes || undefined,
                  })
                  toast.success('Patient marked as admitted. Insurance has been notified.')
                  setShowAdmitModal(false)
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to mark admitted')
                } finally {
                  setAdmitSubmitting(false)
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date *</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={admitForm.admissionDate}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admissionDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionTime">Admission Time</Label>
                <Input
                  id="admissionTime"
                  type="time"
                  value={admitForm.admissionTime}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admissionTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admittingHospital">Admitting Hospital *</Label>
                <Input
                  id="admittingHospital"
                  value={admitForm.admittingHospital}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admittingHospital: e.target.value }))
                  }
                  placeholder="Hospital name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedSurgeryDate">Expected Surgery Date</Label>
                <Input
                  id="expectedSurgeryDate"
                  type="date"
                  value={admitForm.expectedSurgeryDate}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, expectedSurgeryDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={admitForm.notes}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdmitModal(false)}
                  disabled={admitSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={admitSubmitting}>
                  {admitSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Admitted
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mark Discharged confirmation */}
        <Dialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Discharged</DialogTitle>
              <DialogDescription>
                Mark this patient as discharged? Insurance will be notified and can then fill the discharge form and send to PL.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDischargeConfirm(false)}
                disabled={dischargeSubmitting}
              >
                Cancel
              </Button>
              <Button
                disabled={dischargeSubmitting}
                onClick={async () => {
                  setDischargeSubmitting(true)
                  try {
                    await apiPost(`/api/leads/${leadId}/discharge`, {})
                    toast.success('Patient marked as discharged. Insurance has been notified.')
                    setShowDischargeConfirm(false)
                    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                    queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to mark discharged')
                  } finally {
                    setDischargeSubmitting(false)
                  }
                }}
              >
                {dischargeSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Discharged
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}
