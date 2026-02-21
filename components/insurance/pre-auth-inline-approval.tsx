'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PreAuthStatus } from '@prisma/client'
import { apiPost, apiGet } from '@/lib/api-client'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock, Loader2, Hospital, FileText } from 'lucide-react'
import { HospitalSuggestionForm } from '@/components/kyp/hospital-suggestion-form'
import { InsuranceInitiateForm } from '@/components/insurance/insurance-initiate-form'

interface PreAuthInlineApprovalProps {
  leadId: string
  kypSubmissionId: string
  lead?: {
    caseStage?: string
    insuranceName?: string | null
    ipdDrName?: string | null
  }
  preAuthData?: {
    id: string
    approvalStatus?: PreAuthStatus
    rejectionReason?: string | null
    approvalNotes?: string | null
    approvedAmount?: number | null
    isNewHospitalRequest?: boolean
    newHospitalPreAuthRaised?: boolean
    sumInsured?: string | null
    balanceInsured?: string | null
    copay?: string | null
    capping?: string | number | null
    insurance?: string | null
    tpa?: string | null
    hospitalNameSuggestion?: string | null
    hospitalSuggestions?: string[] | null
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    suggestedHospitals?: Array<{
      hospitalName: string
      tentativeBill?: number | null
      roomRentGeneral?: number | null
      roomRentSingle?: number | null
      roomRentDeluxe?: number | null
      roomRentSemiPrivate?: number | null
      notes?: string | null
    }>
  } | null
  onSuccess?: () => void
}

type ApprovalAction = 'approve' | 'temp_approve' | 'reject' | null

export function PreAuthInlineApproval({
  leadId,
  kypSubmissionId,
  lead,
  preAuthData,
  onSuccess,
}: PreAuthInlineApprovalProps) {
  const [action, setAction] = useState<ApprovalAction>(null)
  const [approvedAmount, setApprovedAmount] = useState(
    preAuthData?.approvedAmount != null ? String(preAuthData.approvedAmount) : ''
  )
  const [approvalNotes, setApprovalNotes] = useState(preAuthData?.approvalNotes || '')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHospitalForm, setShowHospitalForm] = useState(false)
  const [showInitiateForm, setShowInitiateForm] = useState(false)

  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const { data: initiateFormData } = useQuery<any>({
    queryKey: ['insurance-initiate-form', leadId],
    queryFn: () => apiGet<any>(`/api/insurance-initiate-form?leadId=${leadId}`),
    enabled: !!leadId,
  })

  const isNewHospital = preAuthData?.isNewHospitalRequest === true
  const newHospitalMarked = preAuthData?.newHospitalPreAuthRaised === true
  const showMarkNewHospitalFirst = isNewHospital && !newHospitalMarked

  const isFullyProcessed =
    preAuthData?.approvalStatus === PreAuthStatus.APPROVED ||
    preAuthData?.approvalStatus === PreAuthStatus.REJECTED

  const isTempApproved = preAuthData?.approvalStatus === PreAuthStatus.TEMP_APPROVED

  const initiateForm = initiateFormData?.initiateForm
  const isInitiateFormFilled =
    initiateForm &&
    initiateForm.totalBillAmount != null &&
    initiateForm.totalBillAmount > 0 &&
    initiateForm.copay !== null &&
    typeof initiateForm.copay === 'number'

  const hasHospitalSuggestions =
    (preAuthData?.suggestedHospitals && preAuthData.suggestedHospitals.length > 0) || false

  const hasLegacyHospitals =
    (preAuthData?.hospitalSuggestions &&
      (preAuthData.hospitalSuggestions as string[]).length > 0) ||
    preAuthData?.hospitalNameSuggestion

  const hasAnyHospitalData = hasHospitalSuggestions || !!hasLegacyHospitals
  const isPreAuthRaised = 
    lead?.caseStage === 'PREAUTH_RAISED' || 
    lead?.caseStage === 'PREAUTH_COMPLETE' ||
    lead?.caseStage === 'INITIATED' ||
    lead?.caseStage === 'ADMITTED' ||
    lead?.caseStage === 'DISCHARGED'
  const shouldForceHospitalForm = !hasAnyHospitalData

  useEffect(() => {
    // Show if query param is present
    if (searchParams.get('initiate') === 'true') {
      setShowInitiateForm(true)
    }
    // Show by default if in raised/complete stage AND form is not filled
    else if (isPreAuthRaised && !isInitiateFormFilled && initiateFormData) {
      setShowInitiateForm(true)
    }
  }, [searchParams, isPreAuthRaised, isInitiateFormFilled, !!initiateFormData])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleApprove = async (status: 'APPROVED' | 'TEMP_APPROVED') => {
    if (!hasAnyHospitalData) {
      toast.error('Please suggest hospitals before approving')
      return
    }
    if (status === 'APPROVED' && !isInitiateFormFilled) {
      toast.error('Please fill the Insurance Initial Form before giving full approval')
      return
    }
    if (!approvedAmount || isNaN(Number(approvedAmount)) || Number(approvedAmount) < 0) {
      toast.error('Please enter a valid approved amount')
      return
    }

    setIsSubmitting(true)
    try {
      await apiPost(`/api/pre-auth/${kypSubmissionId}/approve`, {
        approvalStatus: status,
        approvedAmount: Number(approvedAmount),
        approvalNotes: approvalNotes.trim() || undefined,
      })
      const label = status === 'TEMP_APPROVED' ? 'temporarily approved' : 'approved'
      toast.success(`Pre-authorization ${label} successfully`)
      queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
      setAction(null)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve pre-auth')
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
      await apiPost(`/api/pre-auth/${kypSubmissionId}/reject`, { reason: rejectionReason })
      toast.success('Pre-authorization rejected')
      queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
      setAction(null)
      setRejectionReason('')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject pre-auth')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkNewHospitalRaised = async () => {
    setIsSubmitting(true)
    try {
      await apiPost(`/api/pre-auth/${kypSubmissionId}/mark-new-hospital-raised`, {})
      toast.success('Marked pre-auth raised for new hospital')
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Shared: hospital suggestions list (read-only) ───────────────────────────
  const hospitalSuggestionsJsx = hasAnyHospitalData ? (
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
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 ${
                preAuthData.requestedHospitalName === hospital.hospitalName
                  ? 'border-teal-500 bg-teal-50/30'
                  : 'border-gray-100 dark:border-gray-800'
              }`}
            >
              <div className="font-bold flex justify-between">
                {hospital.hospitalName}
                {preAuthData.requestedHospitalName === hospital.hospitalName && (
                  <Badge className="bg-teal-500">SELECTED</Badge>
                )}
              </div>
              <div className="text-sm mt-2 space-y-1 text-muted-foreground">
                {hospital.tentativeBill && (
                  <p>Tentative Bill: ₹{hospital.tentativeBill.toLocaleString()}</p>
                )}
                <p>
                  Room Rents:{' '}
                  {[
                    hospital.roomRentGeneral != null && `Gen: ₹${hospital.roomRentGeneral.toLocaleString()}`,
                    hospital.roomRentSingle != null && `Single: ₹${hospital.roomRentSingle.toLocaleString()}`,
                    hospital.roomRentDeluxe != null && `Deluxe: ₹${hospital.roomRentDeluxe.toLocaleString()}`,
                    hospital.roomRentSemiPrivate != null && `Semi-Pvt: ₹${hospital.roomRentSemiPrivate.toLocaleString()}`,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ) : null

  // ─── Shared: approval detail form (amount + notes + confirm button) ──────────
  // isTemp controls labels and button colour; targetStatus drives the API call.
  const approvalDetailJsx = (isTemp: boolean) => (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {isTemp ? 'Temporary Approval Details' : 'Approval Details'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
          Cancel
        </Button>
      </div>

      <div>
        <Label htmlFor="approvedAmount">
          Approved Amount <span className="text-red-500">*</span>
        </Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            ₹
          </span>
          <Input
            id="approvedAmount"
            type="number"
            min="0"
            step="0.01"
            value={approvedAmount}
            onChange={(e) => setApprovedAmount(e.target.value)}
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="approvalNotes">
          {isTemp ? 'Conditions / Notes' : 'Approval Notes'}{' '}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea
          id="approvalNotes"
          value={approvalNotes}
          onChange={(e) => setApprovalNotes(e.target.value)}
          placeholder={
            isTemp
              ? 'Specify conditions for temporary approval…'
              : 'Any notes for the BD team…'
          }
          rows={3}
          className="mt-1"
        />
      </div>

      <Button
        onClick={() => handleApprove(isTemp ? 'TEMP_APPROVED' : 'APPROVED')}
        disabled={isSubmitting}
        className={
          isTemp
            ? 'w-full bg-amber-500 hover:bg-amber-600 text-white'
            : 'w-full bg-green-600 hover:bg-green-700 text-white'
        }
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isTemp ? 'Confirm Temporary Approval' : 'Confirm Approval'}
      </Button>
    </div>
  )

  // ─── 1. Fully processed (APPROVED / REJECTED) — locked read-only ─────────────
  if (isFullyProcessed) {
    const isApproved = preAuthData?.approvalStatus === PreAuthStatus.APPROVED
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div
              className={`p-4 rounded-lg border ${
                isApproved
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {isApproved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`font-medium ${
                    isApproved
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {isApproved
                    ? 'Pre-authorization has been approved'
                    : 'Pre-authorization has been rejected'}
                </span>
                {isApproved ? (
                  <Badge className="bg-green-600 text-white ml-2">Approved</Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">Rejected</Badge>
                )}
              </div>
              {isApproved && preAuthData?.approvedAmount != null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Approved Amount:{' '}
                  <span className="font-semibold">
                    ₹{preAuthData.approvedAmount.toLocaleString()}
                  </span>
                </p>
              )}
              {isApproved && preAuthData?.approvalNotes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Notes: {preAuthData.approvalNotes}
                </p>
              )}
              {!isApproved && preAuthData?.rejectionReason && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Reason: {preAuthData.rejectionReason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {hospitalSuggestionsJsx}

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

  // ─── 2. Temporarily approved — fill initiate form, then confirm full approval ─
  if (isTempApproved) {
    return (
      <div className="space-y-6">
        {/* Status banner */}
        <Card>
          <CardContent className="pt-6">
            <div className="p-4 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  Pre-authorization is temporarily approved
                </span>
                <Badge className="bg-amber-500 text-white ml-2">Temp Approved</Badge>
              </div>
              {preAuthData?.approvedAmount != null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Approved Amount:{' '}
                  <span className="font-semibold">
                    ₹{preAuthData.approvedAmount.toLocaleString()}
                  </span>
                </p>
              )}
              {preAuthData?.approvalNotes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Conditions: {preAuthData.approvalNotes}
                </p>
              )}
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                Fill in the Insurance Initial Form below, then give final approval.
              </p>
            </div>
          </CardContent>
        </Card>

        {hospitalSuggestionsJsx}

        {/* Insurance Initiate Form — editable at PREAUTH_COMPLETE */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold px-1">Insurance Initial Form</h3>
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

        {/* Confirm full approval */}
        <Card>
          <CardHeader>
            <CardTitle>Confirm Full Approval</CardTitle>
            <CardDescription>
              Once the Initial Form is filled, confirm full approval to complete Step 4.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isInitiateFormFilled && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Fill in the Insurance Initial Form above to enable full approval.
              </p>
            )}
            {action === null && (
              <Button
                onClick={() => setAction('approve')}
                disabled={!isInitiateFormFilled}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Give Full Approval
              </Button>
            )}
            {action === 'approve' && approvalDetailJsx(false)}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── 3. Active — PENDING, awaiting Insurance decision ────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {shouldForceHospitalForm ? 'Suggest Hospitals' : 'Complete Pre-Authorization'}
        </CardTitle>
        <CardDescription>
          {shouldForceHospitalForm
            ? 'Hospital suggestions are required before proceeding with pre-authorization'
            : 'Review hospital suggestions and approve or reject the pre-authorization request'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hospital suggestion form */}
        {(shouldForceHospitalForm || showHospitalForm) && (
          <HospitalSuggestionForm
            kypSubmissionId={kypSubmissionId}
            initialSumInsured={preAuthData?.sumInsured || ''}
            initialBalanceInsured={preAuthData?.balanceInsured || ''}
            initialCopayPercentage={preAuthData?.copay || ''}
            initialCapping={preAuthData?.capping ? Number(preAuthData.capping) : undefined}
            initialInsuranceName={preAuthData?.insurance || lead?.insuranceName || ''}
            initialTpa={preAuthData?.tpa || ''}
            initialDoctorName={lead?.ipdDrName || ''}
            initialHospitals={preAuthData?.suggestedHospitals}
            onSuccess={() => {
              setShowHospitalForm(false)
              queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
            }}
            onCancel={shouldForceHospitalForm ? undefined : () => setShowHospitalForm(false)}
          />
        )}

        {/* Hospitals provided — read-only view with modify/lock status */}
        {hasAnyHospitalData && !shouldForceHospitalForm && !showHospitalForm && (
          <div className="space-y-4">
            {/* Suggested hospitals read-only display */}
            {hospitalSuggestionsJsx}

            {/* Modify button only before pre-auth is raised */}
            {!isPreAuthRaised && (
              <Button onClick={() => setShowHospitalForm(true)} variant="outline" size="sm">
                Modify Hospital Suggestions
              </Button>
            )}
            {isPreAuthRaised && (
              <p className="text-xs text-muted-foreground">
                Hospital suggestions are locked — pre-authorization has been raised by BD.
              </p>
            )}
          </div>
        )}

        {/* Approval section — only visible after pre-auth is raised */}
        {hasAnyHospitalData && !showHospitalForm && isPreAuthRaised && (
          <div className="space-y-5 border-t pt-5">
            {showMarkNewHospitalFirst && (
              <Button onClick={handleMarkNewHospitalRaised} disabled={isSubmitting}>
                Mark pre-auth raised for new hospital
              </Button>
            )}

            {/* Insurance Initiate Form */}
            {showInitiateForm && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Insurance Initiate Form</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowInitiateForm(false)}>
                    Close
                  </Button>
                </div>
                <InsuranceInitiateForm
                  leadId={leadId}
                  initialData={initiateFormData?.initiateForm}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['insurance-initiate-form', leadId] })
                    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                    setShowInitiateForm(false)
                  }}
                  embedded
                />
              </div>
            )}

            {/* Three action buttons */}
            {action === null && (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setAction('approve')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve
                </Button>

                <Button
                  onClick={() => setAction('temp_approve')}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Temporary Approval
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => setAction('reject')}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>

                {isTempApproved && !showInitiateForm && (
                  <Button
                    onClick={() => setShowInitiateForm(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isInitiateFormFilled ? 'Edit Initial Form' : 'Fill Initial Form'}
                  </Button>
                )}
              </div>
            )}


            {/* Approve detail form */}
            {action === 'approve' && approvalDetailJsx(false)}

            {/* Temp approve detail form */}
            {action === 'temp_approve' && approvalDetailJsx(true)}

            {/* Reject form */}
            {action === 'reject' && (
              <div className="space-y-4 rounded-lg border border-red-200 dark:border-red-800 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-red-700 dark:text-red-400">Rejection Details</p>
                  <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
                    Cancel
                  </Button>
                </div>
                <div>
                  <Label htmlFor="rejectionReason">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Provide a reason for rejection"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Rejection
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
