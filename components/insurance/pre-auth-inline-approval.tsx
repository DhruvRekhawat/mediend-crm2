'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PreAuthStatus } from '@prisma/client'
import { apiPost, apiGet } from '@/lib/api-client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2, Hospital } from 'lucide-react'
import { HospitalSuggestionForm } from '@/components/kyp/hospital-suggestion-form'
import { InsuranceInitiateForm } from '@/components/insurance/insurance-initiate-form'

interface PreAuthInlineApprovalProps {
  leadId: string
  kypSubmissionId: string
  lead?: {
    caseStage?: string
  }
  preAuthData?: {
    id: string
    approvalStatus?: PreAuthStatus
    rejectionReason?: string | null
    isNewHospitalRequest?: boolean
    newHospitalPreAuthRaised?: boolean
    sumInsured?: string | null
    balanceInsured?: string | null
    copay?: string | null
    tpa?: string | null
    hospitalNameSuggestion?: string | null
    hospitalSuggestions?: string[] | null
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    suggestedHospitals?: Array<{
      hospitalName: string
      tentativeBill?: number | null
      roomRentGeneral?: number | null
      roomRentPrivate?: number | null
      roomRentICU?: number | null
      notes?: string | null
    }>
  } | null
  onSuccess?: () => void
}

export function PreAuthInlineApproval({
  leadId,
  kypSubmissionId,
  lead,
  preAuthData,
  onSuccess,
}: PreAuthInlineApprovalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHospitalForm, setShowHospitalForm] = useState(false)

  const queryClient = useQueryClient()

  const { data: initiateFormData } = useQuery<any>({
    queryKey: ['insurance-initiate-form', leadId],
    queryFn: () => apiGet<any>(`/api/insurance-initiate-form?leadId=${leadId}`),
    enabled: !!leadId,
  })

  const isNewHospital = preAuthData?.isNewHospitalRequest === true
  const newHospitalMarked = preAuthData?.newHospitalPreAuthRaised === true
  const showMarkNewHospitalFirst = isNewHospital && !newHospitalMarked

  const isAlreadyProcessed =
    preAuthData?.approvalStatus === PreAuthStatus.APPROVED ||
    preAuthData?.approvalStatus === PreAuthStatus.REJECTED

  const initiateForm = initiateFormData?.initiateForm
  const isInitiateFormFilled =
    initiateForm &&
    initiateForm.totalBillAmount != null &&
    initiateForm.totalBillAmount > 0 &&
    initiateForm.copay !== null &&
    typeof initiateForm.copay === 'number'

  const hasHospitalSuggestions =
    (preAuthData?.suggestedHospitals &&
    preAuthData.suggestedHospitals.length > 0) || false

  const hasLegacyHospitals =
    (preAuthData?.hospitalSuggestions &&
    (preAuthData.hospitalSuggestions as string[]).length > 0) ||
    preAuthData?.hospitalNameSuggestion

  const hasAnyHospitalData = hasHospitalSuggestions || !!hasLegacyHospitals

  const isPreAuthRaised = lead?.caseStage === 'PREAUTH_RAISED'

  // Updated logic - show hospital form for more stages
  const isHospitalSuggestionStage =
    lead?.caseStage === 'KYP_BASIC_COMPLETE' ||
    lead?.caseStage === 'KYP_BASIC_PENDING' ||
    lead?.caseStage === 'KYP_PENDING' ||
    lead?.caseStage === 'KYP_DETAILED_PENDING' ||
    lead?.caseStage === 'KYP_DETAILED_COMPLETE' ||
    lead?.caseStage === 'PREAUTH_RAISED'

  // Data-driven logic as recommended
  const shouldAlwaysShowHospitalForm = 
    preAuthData?.approvalStatus !== PreAuthStatus.APPROVED && 
    preAuthData?.approvalStatus !== PreAuthStatus.REJECTED
    
  const shouldForceHospitalForm = !hasAnyHospitalData

  const handleApprove = async () => {
    if (!hasAnyHospitalData) {
      toast.error('Please suggest hospitals before approving')
      return
    }

    if (!isInitiateFormFilled) {
      toast.error('Please fill the initiate form before approving')
      return
    }

    setIsSubmitting(true)
    try {
      await apiPost(`/api/pre-auth/${kypSubmissionId}/approve`, {})
      toast.success('Pre-authorization approved successfully')
      queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
      setAction(null)
      onSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to approve pre-auth'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }

    setIsSubmitting(true)
    try {
      await apiPost(`/api/pre-auth/${kypSubmissionId}/reject`, {
        reason: rejectionReason,
      })
      toast.success('Pre-authorization rejected')
      queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
      setAction(null)
      setRejectionReason('')
      onSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reject pre-auth'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkNewHospitalRaised = async () => {
    setIsSubmitting(true)
    try {
      await apiPost(
        `/api/pre-auth/${kypSubmissionId}/mark-new-hospital-raised`,
        {}
      )
      toast.success('Marked pre-auth raised for new hospital')
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAlreadyProcessed) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                {preAuthData?.approvalStatus === PreAuthStatus.APPROVED ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-600">
                      Pre-authorization has been approved
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-600">
                      Pre-authorization has been rejected
                    </span>
                  </>
                )}
              </div>

              {preAuthData?.approvalStatus === PreAuthStatus.REJECTED &&
                preAuthData?.rejectionReason && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Reason: {preAuthData.rejectionReason}
                  </p>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Show Hospital Suggestions (Read-only) */}
        {hasAnyHospitalData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Hospital className="w-4 h-4 text-blue-600" />
                Hospital Suggestions Provided
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preAuthData?.suggestedHospitals?.map((hospital, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border-2 ${preAuthData.requestedHospitalName === hospital.hospitalName ? 'border-teal-500 bg-teal-50/30' : 'border-gray-100'}`}>
                    <div className="font-bold flex justify-between">
                      {hospital.hospitalName}
                      {preAuthData.requestedHospitalName === hospital.hospitalName && <Badge className="bg-teal-500">SELECTED</Badge>}
                    </div>
                    <div className="text-sm mt-2 space-y-1">
                      {hospital.tentativeBill && <p>Tentative Bill: ₹{hospital.tentativeBill.toLocaleString()}</p>}
                      <p>Room Rents: Gen: ₹{hospital.roomRentGeneral?.toLocaleString()}, Pvt: ₹{hospital.roomRentPrivate?.toLocaleString()}, ICU: ₹{hospital.roomRentICU?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show Initiate Form (Read-only) */}
        {initiateForm && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold px-1">Insurance Initiate Form Details</h3>
            <InsuranceInitiateForm 
              leadId={leadId} 
              initialData={initiateForm}
              onSuccess={() => {}}
              embedded
              readOnly={true}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {shouldForceHospitalForm
            ? 'Suggest Hospitals'
            : 'Complete Pre-Authorization'}
        </CardTitle>
        <CardDescription>
          {shouldForceHospitalForm
            ? 'Hospital suggestions are required before proceeding with pre-authorization'
            : 'Review hospital suggestions and approve or reject the pre-authorization request'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Always show hospital suggestion form when data allows it */}
        {shouldAlwaysShowHospitalForm && (shouldForceHospitalForm || showHospitalForm) && (
          <HospitalSuggestionForm
            kypSubmissionId={kypSubmissionId}
            initialSumInsured={preAuthData?.sumInsured || ''}
            initialBalanceInsured={preAuthData?.balanceInsured || ''}
            initialCopayPercentage={preAuthData?.copay || ''}
            initialTpa={preAuthData?.tpa || ''}
            initialHospitals={preAuthData?.suggestedHospitals}
            onSuccess={() => {
              setShowHospitalForm(false)
              queryClient.invalidateQueries({
                queryKey: ['kyp-submission', leadId],
              })
            }}
            onCancel={shouldForceHospitalForm ? undefined : () => setShowHospitalForm(false)}
          />
        )}

        {/* Show modify button if hospitals exist and form is not forced */}
        {shouldAlwaysShowHospitalForm && hasAnyHospitalData && !shouldForceHospitalForm && !showHospitalForm && !isPreAuthRaised && (
          <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <p className="text-sm text-green-900 dark:text-green-100 mb-3">
              Hospital suggestions have been provided.
            </p>
            <Button onClick={() => setShowHospitalForm(true)} variant="outline">
              Modify Hospital Suggestions
            </Button>
          </div>
        )}

        {/* Show info message if hospitals exist and pre-auth is raised */}
        {shouldAlwaysShowHospitalForm && hasAnyHospitalData && !showHospitalForm && isPreAuthRaised && (
          <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <p className="text-sm text-green-900 dark:text-green-100">
              Hospital suggestions have been provided and pre-authorization has been raised.
            </p>
          </div>
        )}

        {/* Pre-auth approval section - only show when hospitals are provided */}
        {shouldAlwaysShowHospitalForm && hasAnyHospitalData && !showHospitalForm && (
          <div className="space-y-4 border-t pt-4">
            {showMarkNewHospitalFirst && (
              <Button
                onClick={handleMarkNewHospitalRaised}
                disabled={isSubmitting}
              >
                Mark pre-auth raised for new hospital
              </Button>
            )}

            {/* Insurance Initiate Form Integration */}
            {lead?.caseStage === 'PREAUTH_RAISED' && (
              <div className="mb-6 space-y-4">
                <InsuranceInitiateForm 
                  leadId={leadId} 
                  initialData={initiateFormData?.initiateForm}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['insurance-initiate-form', leadId] })
                    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                  }}
                  embedded
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => setAction('approve')}
                disabled={!hasAnyHospitalData || !isInitiateFormFilled}
                className="flex-1"
              >
                Approve Pre-Auth
              </Button>

              <Button
                variant="destructive"
                onClick={() => setAction('reject')}
                className="flex-1"
              >
                Reject Pre-Auth
              </Button>
            </div>

            {action === 'approve' && (
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Approval
              </Button>
            )}

            {action === 'reject' && (
              <>
                <Textarea
                  placeholder="Reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Rejection
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
