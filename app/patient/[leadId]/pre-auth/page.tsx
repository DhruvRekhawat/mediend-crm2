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
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { QueryList } from '@/components/kyp/query-list'
import { QueryForm } from '@/components/kyp/query-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CaseStage } from '@prisma/client'
import { canRaisePreAuth, canCompletePreAuth, canAddKYPDetails } from '@/lib/case-permissions'

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
    handledAt: string
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
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
  const preAuthRaised = lead?.caseStage === CaseStage.PREAUTH_RAISED || lead?.caseStage === CaseStage.PREAUTH_COMPLETE

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
            {isBD && preAuthRaised && (
              <Card>
                <CardHeader>
                  <CardTitle>Pre-Auth Request</CardTitle>
                  <CardDescription>Your pre-auth request has been submitted</CardDescription>
                </CardHeader>
                <CardContent>
                  {kypSubmission?.preAuthData && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Hospital:</p>
                        <p className="text-sm text-muted-foreground">{kypSubmission.preAuthData.requestedHospitalName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Room Type:</p>
                        <p className="text-sm text-muted-foreground">{kypSubmission.preAuthData.requestedRoomType || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Disease Description:</p>
                        <p className="text-sm text-muted-foreground">{kypSubmission.preAuthData.diseaseDescription || '-'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {isInsurance && (canAddDetails || canComplete) && (
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
            {isInsurance && !canAddDetails && !canComplete && preAuthRaised && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Pre-auth has already been completed
                </CardContent>
              </Card>
            )}
            {isInsurance && !canAddDetails && !canComplete && !preAuthRaised && lead?.caseStage === CaseStage.KYP_COMPLETE && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  KYP details added. Waiting for BD to raise pre-auth with hospital and room selection.
                </CardContent>
              </Card>
            )}
            {isInsurance && !canAddDetails && !canComplete && !preAuthRaised && lead?.caseStage !== CaseStage.KYP_COMPLETE && (
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
