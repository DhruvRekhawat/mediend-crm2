'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { PreAuthForm } from '@/components/kyp/pre-auth-form'
import { PreAuthDetailsView } from '@/components/kyp/pre-auth-details-view'
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { QueryList } from '@/components/kyp/query-list'
import { QueryForm } from '@/components/kyp/query-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CaseStage } from '@prisma/client'
import { canRaisePreAuth, canCompletePreAuth, canAddKYPDetails, canGeneratePDF } from '@/lib/case-permissions'
import { useState } from 'react'

interface KYPSubmission {
  id: string
  leadId: string
  status: string
  lead: {
    id: string
    leadRef: string
    patientName: string
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

  const canRaise = lead && user && canRaisePreAuth(user, lead)
  const canComplete = lead && user && canCompletePreAuth(user, lead)
  const canAddDetails = lead && user && canAddKYPDetails(user, lead)
  const canPDF = lead && user && canGeneratePDF(user, lead)
  const preAuthRaised = lead?.caseStage === CaseStage.PREAUTH_RAISED || lead?.caseStage === CaseStage.PREAUTH_COMPLETE
  const preAuthComplete = lead?.caseStage === CaseStage.PREAUTH_COMPLETE

  const [showEditForm, setShowEditForm] = useState(false)
  
  // Determine if we should show details view or form
  const hasPreAuthData = !!kypSubmission?.preAuthData
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

        <Tabs defaultValue="pre-auth" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pre-auth">Pre-Authorization</TabsTrigger>
            <TabsTrigger value="queries">
              Q&A
              {kypSubmission?.preAuthData && (
                <span className="ml-2 text-xs">({kypSubmission.preAuthData.id ? 'Active' : ''})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pre-auth" className="space-y-4">
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
                  preAuthData={kypSubmission.preAuthData}
                  caseStage={lead?.caseStage || CaseStage.PREAUTH_RAISED}
                  leadRef={kypSubmission.lead.leadRef}
                  patientName={kypSubmission.lead.patientName}
                />
              </>
            )}

            {/* Insurance: Show form to add details (first time) */}
            {isInsurance && canAddDetails && !showEditForm && (
              <PreAuthForm
                kypSubmissionId={kypSubmission!.id}
                initialData={{
                  ...kypSubmission?.preAuthData,
                  hospitalSuggestions: kypSubmission?.preAuthData?.hospitalSuggestions ?? undefined,
                  roomTypes: kypSubmission?.preAuthData?.roomTypes ?? undefined,
                }}
                isReadOnly={false}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                }}
                onCancel={() => router.push(`/patient/${leadId}`)}
              />
            )}

            {/* Insurance: Show form to complete pre-auth */}
            {isInsurance && canComplete && !showEditForm && (
              <PreAuthForm
                kypSubmissionId={kypSubmission!.id}
                initialData={{
                  ...kypSubmission?.preAuthData,
                  hospitalSuggestions: kypSubmission?.preAuthData?.hospitalSuggestions ?? undefined,
                  roomTypes: kypSubmission?.preAuthData?.roomTypes ?? undefined,
                }}
                isReadOnly={false}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                }}
                onCancel={() => router.push(`/patient/${leadId}`)}
              />
            )}

            {/* Show details view when data exists and no form should be shown */}
            {shouldShowDetails && kypSubmission?.preAuthData && (
              <>
                <PreAuthDetailsView
                  preAuthData={kypSubmission.preAuthData}
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
                            if (response.ok) {
                              alert('PDF generation initiated')
                            } else {
                              alert('Failed to generate PDF')
                            }
                          } catch (error) {
                            alert('Error generating PDF')
                          }
                        }}
                      >
                        Generate PDF
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

          <TabsContent value="queries" className="space-y-4">
            {kypSubmission.preAuthData && (
              <>
                <QueryList preAuthorizationId={kypSubmission.preAuthData.id} />
                {isInsurance && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Raise New Query</CardTitle>
                      <CardDescription>Ask a question to the BD team</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <QueryForm
                        preAuthorizationId={kypSubmission.preAuthData.id}
                        onSuccess={() => {
                          queryClient.invalidateQueries({ queryKey: ['queries', kypSubmission.preAuthData!.id] })
                        }}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            {!kypSubmission.preAuthData && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Please complete pre-authorization first to enable Q&A
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  )
}
