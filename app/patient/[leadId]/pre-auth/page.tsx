'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Phone, MapPin, Stethoscope, Tag, User } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

import { PreAuthInlineApproval } from '@/components/insurance/pre-auth-inline-approval'
import { CaseStage, PreAuthStatus } from '@prisma/client'
import { canCompletePreAuth, canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'

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
    balanceInsured: string | null
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
      roomRentSingle: number | null
      roomRentDeluxe: number | null
      roomRentSemiPrivate: number | null
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

  const canComplete = lead && user && canCompletePreAuth({ role: user.role } as any, lead)

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

        {/* Patient overview */}
        {lead && (
          <Card className="border-2 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Patient overview
              </CardTitle>
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
                {lead.ipdDrName && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800">
                      <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Doctor</Label>
                      <p className="text-sm font-medium">{lead.ipdDrName}</p>
                    </div>
                  </div>
                )}
                {lead.opdDrName && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                      <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Suggested Doctor</Label>
                      <p className="text-sm font-medium">{lead.opdDrName}</p>
                    </div>
                  </div>
                )}
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
            </CardContent>
          </Card>
        )}

        {/* Hospital Suggestion and Pre-auth Approval */}
        {kypSubmission && (
          lead?.caseStage === 'KYP_PENDING' || 
          lead?.caseStage === 'KYP_BASIC_COMPLETE' || 
          lead?.caseStage === 'KYP_BASIC_PENDING' ||
          lead?.caseStage === 'KYP_DETAILED_PENDING' ||
          lead?.caseStage === 'KYP_DETAILED_COMPLETE' ||
          lead?.caseStage === 'PREAUTH_RAISED' ||
          lead?.caseStage === 'PREAUTH_COMPLETE' ||
          lead?.caseStage === 'INITIATED' ||
          lead?.caseStage === 'ADMITTED' ||
          lead?.caseStage === 'DISCHARGED' ||
          canComplete
        ) && (
          <PreAuthInlineApproval
            leadId={leadId}
            kypSubmissionId={kypSubmission.id}
            lead={lead}
            preAuthData={kypSubmission.preAuthData}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
              queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
            }}
          />
        )}
      </div>
    </AuthenticatedLayout>
  )
}
