'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PreAuthStatus } from '@prisma/client'
import { apiPost, apiGet } from '@/lib/api-client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
    copay?: string | null
    tpa?: string | null
    hospitalNameSuggestion?: string | null
    hospitalSuggestions?: string[] | null
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

  const initiateForm = initiateFormData?.data?.initiateForm
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

  // Debug logging
  console.log('=== PRE-AUTH DEBUG ===')
  console.log('lead?.caseStage:', lead?.caseStage)
  console.log('hasAnyHospitalData:', hasAnyHospitalData)
  console.log('preAuthData?.approvalStatus:', preAuthData?.approvalStatus)
  console.log('hasHospitalSuggestions:', hasHospitalSuggestions)
  console.log('hasLegacyHospitals:', hasLegacyHospitals)

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
    )
  }

  return (
    <Card>
      {/* Debug Panel */}
      <CardContent className="pt-6">
        <div className="p-3 mb-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <strong>Debug Info:</strong><br />
          Case Stage: {lead?.caseStage}<br />
          Has Hospital Data: {hasAnyHospitalData ? 'Yes' : 'No'}<br />
          Approval Status: {preAuthData?.approvalStatus || 'None'}<br />
          Should Show Hospital Form: {shouldAlwaysShowHospitalForm ? 'Yes' : 'No'}<br />
          Should Force Hospital Form: {shouldForceHospitalForm ? 'Yes' : 'No'}
        </div>
      </CardContent>

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
        {shouldAlwaysShowHospitalForm && shouldForceHospitalForm && (
          <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">
              Hospital suggestions are required before proceeding with pre-authorization.
            </p>
            <Button onClick={() => setShowHospitalForm(true)} variant="default">
              Add Hospital Suggestions
            </Button>
          </div>
        )}

        {/* Show hospital form when user clicks to add/modify */}
        {shouldAlwaysShowHospitalForm && showHospitalForm && (
          <HospitalSuggestionForm
            kypSubmissionId={kypSubmissionId}
            initialSumInsured={preAuthData?.sumInsured || ''}
            initialCopayPercentage={preAuthData?.copay || ''}
            initialTpa={preAuthData?.tpa || ''}
            initialHospitals={preAuthData?.suggestedHospitals}
            onSuccess={() => {
              setShowHospitalForm(false)
              queryClient.invalidateQueries({
                queryKey: ['kyp-submission', leadId],
              })
            }}
            onCancel={() => setShowHospitalForm(false)}
          />
        )}

        {/* Show modify button if hospitals exist and form is not forced */}
        {shouldAlwaysShowHospitalForm && hasAnyHospitalData && !shouldForceHospitalForm && !showHospitalForm && (
          <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <p className="text-sm text-green-900 dark:text-green-100 mb-3">
              Hospital suggestions have been provided.
            </p>
            <Button onClick={() => setShowHospitalForm(true)} variant="outline">
              Modify Hospital Suggestions
            </Button>
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
                  initialData={initiateFormData?.data?.initiateForm}
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
