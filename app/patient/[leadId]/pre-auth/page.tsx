'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Phone, MapPin, Stethoscope, Tag, User } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

import { HospitalSuggestionForm } from '@/components/kyp/hospital-suggestion-form'
import { PreAuthDetailsView } from '@/components/kyp/pre-auth-details-view'
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { PreAuthApprovalModal } from '@/components/kyp/pre-auth-approval-modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CaseStage, PreAuthStatus } from '@prisma/client'
import { canRaisePreAuth, canCompletePreAuth, canAddKYPDetails, canGeneratePDF, canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'
import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

interface KYPSubmission {
  id: string
  leadId: string
  status: string
  lead: {
    id: string
    leadRef: string
    patientName: string
  }
  location?: string | null
  area?: string | null
  preAuthData?: {
    id: string
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    hospitalNameSuggestion: string | null
    hospitalSuggestions?: string[] | null
    suggestedHospitals?: Array<{
      hospitalName: string
      tentativeBill: number | null
      roomRentGeneral: number | null
      roomRentPrivate: number | null
      roomRentICU: number | null
      notes: string | null
    }>
    roomTypes?: Array<{ name: string; rent: string }> | null
    insurance: string | null
    tpa: string | null
    handledAt?: string | null
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
    preAuthRaisedAt?: string | null
    handledBy?: {
      id: string
      name: string
    } | null
    preAuthRaisedBy?: {
      id: string
      name: string
    } | null
    approvalStatus?: PreAuthStatus
    rejectionReason?: string | null
  } | null
}

export default function PreAuthPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const leadId = params.leadId as string

  const { data: lead } = useQuery<any>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<any>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const { data: kypSubmission, isLoading } = useQuery<KYPSubmission | null>({
    queryKey: ['kyp-submission', leadId],
    queryFn: async () => {
      const submissions = await apiGet<KYPSubmission[]>('/api/kyp')
      return submissions.find((s) => s.leadId === leadId) || null
    },
    enabled: !!leadId,
  })

  // Hooks must be called before any conditional returns
  const [showEditForm, setShowEditForm] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading pre-authorization details...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!kypSubmission) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/patient/${leadId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No KYP submission found. Please submit KYP first.
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    )
  }

  const isInsurance = user?.role === 'INSURANCE_HEAD' || user?.role === 'ADMIN'
  const isBD = user?.role === 'BD' || user?.role === 'TEAM_LEAD'

  const canRaise = lead && user && canRaisePreAuth({ role: user.role } as any, lead)
  const canComplete = lead && user && canCompletePreAuth({ role: user.role } as any, lead)
  const canAddDetails = lead && user && canAddKYPDetails({ role: user.role } as any, lead)
  const canPDF = lead && user && canGeneratePDF({ role: user.role } as any, lead)
  const preAuthRaised = lead?.caseStage === CaseStage.PREAUTH_RAISED || lead?.caseStage === CaseStage.PREAUTH_COMPLETE
  const preAuthComplete = lead?.caseStage === CaseStage.PREAUTH_COMPLETE
  
  // Determine if we should show details view or form
  const hasPreAuthData = !!kypSubmission?.preAuthData
  // Don't show details view if we're showing the approval interface
  const shouldShowDetails = hasPreAuthData && !showEditForm && !canRaise && !canAddDetails && !canComplete

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/patient/${leadId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pre-Authorization</h1>
            <p className="text-muted-foreground">
              {kypSubmission?.lead.leadRef} - {kypSubmission?.lead.patientName}
            </p>
          </div>
        </div>

        {/* Patient overview - easy reference while filling the form */}
        {lead && (
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Patient overview
              </CardTitle>
              <CardDescription>Quick reference while filling the form</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="text-sm font-medium">{getPhoneDisplay(lead.phoneNumber, canViewPhoneNumber(user ? { role: user.role } : null))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City</Label>
                    <p className="text-sm font-medium">{(lead.kypSubmission?.location?.trim() || lead.city) ?? '-'}</p>
                  </div>
                </div>
                {lead.kypSubmission?.area?.trim() && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Area</Label>
                      <p className="text-sm font-medium">{lead.kypSubmission.area}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Treatment</Label>
                    <p className="text-sm font-medium">{lead.treatment ?? '-'}</p>
                  </div>
                </div>
                {lead.category && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                      <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <p className="text-sm font-medium">{lead.category}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/patient/${leadId}`}>
                    View full patient details →
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pre-auth" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pre-auth">Pre-Authorization</TabsTrigger>
          </TabsList>

          <TabsContent value="pre-auth" className="space-y-4">
            {/* Insurance: Hospital suggestions (New Flow) */}
            {isInsurance && (lead?.caseStage === CaseStage.KYP_BASIC_PENDING || (canAddDetails && !showEditForm && !canComplete)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggest hospitals</CardTitle>
                  <CardDescription>
                    Add sum insured and suggest hospitals with tentative bills and room rents. BD will then choose and raise pre-auth.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HospitalSuggestionForm
                    kypSubmissionId={kypSubmission!.id}
                    initialSumInsured={kypSubmission?.preAuthData?.sumInsured ?? undefined}
                    initialCopayPercentage={kypSubmission?.preAuthData?.copay ?? undefined}
                    initialTpa={kypSubmission?.preAuthData?.tpa ?? undefined}
                    initialHospitals={kypSubmission?.preAuthData?.suggestedHospitals?.map((h) => ({
                      hospitalName: h.hospitalName,
                      tentativeBill: h.tentativeBill,
                      roomRentGeneral: h.roomRentGeneral,
                      roomRentPrivate: h.roomRentPrivate,
                      roomRentICU: h.roomRentICU,
                      notes: h.notes,
                    }))}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                    }}
                    onCancel={() => router.push(`/patient/${leadId}`)}
                  />
                </CardContent>
              </Card>
            )}

            {/* BD: Show form to raise pre-auth */}
            {isBD && canRaise && !preAuthRaised && (
              <PreAuthRaiseForm
                leadId={leadId}
                initialData={kypSubmission?.preAuthData ? {
                  requestedHospitalName: kypSubmission.preAuthData.requestedHospitalName || undefined,
                  requestedRoomType: kypSubmission.preAuthData.requestedRoomType || undefined,
                  diseaseDescription: kypSubmission.preAuthData.diseaseDescription || undefined,
                  diseaseImages: kypSubmission.preAuthData.diseaseImages as Array<{ name: string; url: string }> | undefined,
                  hospitalSuggestions: kypSubmission.preAuthData.hospitalSuggestions ?? undefined,
                  roomTypes: kypSubmission.preAuthData.roomTypes ?? undefined,
                } : undefined}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                }}
                onCancel={() => router.push(`/patient/${leadId}`)}
              />
            )}

            {/* BD: Show details after raising */}
            {isBD && preAuthRaised && kypSubmission?.preAuthData && (
              <>
                <PreAuthDetailsView
                  preAuthData={kypSubmission.preAuthData as any}
                  caseStage={lead?.caseStage || CaseStage.PREAUTH_RAISED}
                  leadRef={kypSubmission.lead.leadRef}
                  patientName={kypSubmission.lead.patientName}
                />
              </>
            )}



            {/* Insurance: Show approval/rejection interface when pre-auth is raised */}
            {isInsurance && canComplete && !showEditForm && kypSubmission?.preAuthData && (
              <>
                <PreAuthDetailsView
                  preAuthData={kypSubmission.preAuthData as any}
                  caseStage={lead?.caseStage || CaseStage.PREAUTH_RAISED}
                  leadRef={kypSubmission.lead.leadRef}
                  patientName={kypSubmission.lead.patientName}
                />
                {(!kypSubmission.preAuthData.approvalStatus || 
                  (kypSubmission.preAuthData.approvalStatus !== PreAuthStatus.APPROVED && 
                   kypSubmission.preAuthData.approvalStatus !== PreAuthStatus.REJECTED)) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Complete Pre-Authorization</CardTitle>
                      <CardDescription>
                        Review the pre-authorization details and approve or reject the request
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            console.log('Opening approval modal for lead:', leadId)
                            setIsApprovalModalOpen(true)
                          }}
                          className="flex-1"
                          variant="default"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Pre-Auth
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Show details view when data exists and no form should be shown */}
            {shouldShowDetails && kypSubmission?.preAuthData && (
              <>
                <PreAuthDetailsView
                  preAuthData={kypSubmission.preAuthData as any}
                  caseStage={lead?.caseStage || CaseStage.NEW_LEAD}
                  leadRef={kypSubmission.lead.leadRef}
                  patientName={kypSubmission.lead.patientName}
                />
                {canPDF && (
                  <Card>
                    <CardHeader>
                      <CardTitle>PDF Generation</CardTitle>
                      <CardDescription>Generate pre-authorization PDF</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/leads/${leadId}/preauth-pdf`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ recipients: [] }),
                            })
                            const data = await response.json().catch(() => ({}))
                            if (response.ok && data?.data?.pdfUrl) {
                              window.open(data.data.pdfUrl, '_blank', 'noopener,noreferrer')
                              queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                              queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                            } else {
                              alert(data?.error || 'Failed to generate PDF')
                            }
                          } catch (error) {
                            alert('Error generating PDF')
                          }
                        }}
                      >
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Insurance: Waiting states */}
            {isInsurance && !canAddDetails && !canComplete && !hasPreAuthData && lead?.caseStage === CaseStage.KYP_COMPLETE && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  KYP details added. Waiting for BD to raise pre-auth with hospital and room selection.
                </CardContent>
              </Card>
            )}
            {isInsurance && !canAddDetails && !canComplete && !hasPreAuthData && lead?.caseStage !== CaseStage.KYP_COMPLETE && lead?.caseStage !== CaseStage.KYP_PENDING && (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <p className="text-muted-foreground">
                    You add KYP details (hospitals, room types, TPA) when the case is <strong>KYP Pending</strong>—after BD submits KYP.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current stage: <strong>{lead?.caseStage?.replace(/_/g, ' ')}</strong>
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => router.push(`/patient/${leadId}`)}>
                    Back to patient
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Pre-Auth Approval Modal */}
        {kypSubmission?.preAuthData && (
          <PreAuthApprovalModal
            open={isApprovalModalOpen}
            onOpenChange={(open) => {
              setIsApprovalModalOpen(open)
            }}
            leadId={leadId}
            leadRef={kypSubmission.lead.leadRef}
            patientName={kypSubmission.lead.patientName}
            kypSubmissionId={kypSubmission.id}
            preAuthData={kypSubmission.preAuthData}
          />
        )}
      </div>
    </AuthenticatedLayout>
  )
}
