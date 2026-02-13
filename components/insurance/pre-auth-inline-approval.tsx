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
import { InsuranceInitiateForm } from '@/components/insurance/insurance-initiate-form'

interface PreAuthInlineApprovalProps {
  leadId: string
  kypSubmissionId: string
  preAuthData: {
    id: string
    approvalStatus?: PreAuthStatus
    rejectionReason?: string | null
    isNewHospitalRequest?: boolean
    newHospitalPreAuthRaised?: boolean
  }
  onSuccess?: () => void
}

export function PreAuthInlineApproval({
  leadId,
  kypSubmissionId,
  preAuthData,
  onSuccess,
}: PreAuthInlineApprovalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryClient = useQueryClient()

  // Fetch initiate form data
  const { data: initiateFormData } = useQuery<any>({
    queryKey: ['insurance-initiate-form', leadId],
    queryFn: () => apiGet<any>(`/api/insurance-initiate-form?leadId=${leadId}`),
    enabled: !!leadId,
  })

  const isNewHospital = preAuthData.isNewHospitalRequest === true
  const newHospitalMarked = preAuthData.newHospitalPreAuthRaised === true
  const showMarkNewHospitalFirst = isNewHospital && !newHospitalMarked

  const isAlreadyProcessed =
    preAuthData.approvalStatus === PreAuthStatus.APPROVED ||
    preAuthData.approvalStatus === PreAuthStatus.REJECTED

  // Check if initiate form has been filled (required: totalBillAmount and copay)
  const initiateForm = initiateFormData?.data?.initiateForm
  const isInitiateFormFilled = initiateForm && 
    initiateForm.totalBillAmount != null && 
    initiateForm.totalBillAmount > 0 &&
    initiateForm.copay !== null && 
    typeof initiateForm.copay === 'number'

  const handleApprove = async () => {
    // Double check that form is filled before approving
    if (!isInitiateFormFilled) {
      toast.error('Please fill the initiate form before approving')
      setAction(null)
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
      toast.error(error instanceof Error ? error.message : 'Failed to approve pre-auth')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkNewHospitalRaised = async () => {
    setIsSubmitting(true)
    try {
      await apiPost(`/api/pre-auth/${kypSubmissionId}/mark-new-hospital-raised`, {})
      toast.success('Marked pre-auth raised for new hospital')
      queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
      queryClient.invalidateQueries({ queryKey: ['case-chat', leadId] })
      setAction(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
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
      toast.error(error instanceof Error ? error.message : 'Failed to reject pre-auth')
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
              {preAuthData.approvalStatus === PreAuthStatus.APPROVED ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">Pre-authorization has been approved</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-600">Pre-authorization has been rejected</span>
                </>
              )}
            </div>
            {preAuthData.approvalStatus === PreAuthStatus.REJECTED && preAuthData.rejectionReason && (
              <p className="mt-2 text-sm text-muted-foreground">Reason: {preAuthData.rejectionReason}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Pre-Authorization</CardTitle>
        <CardDescription>
          Fill the initiate form and approve or reject the pre-authorization request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* New Hospital Flow */}
        {showMarkNewHospitalFirst && action === null && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              This is a new hospital request. Mark that pre-auth has been raised for the new hospital, then approve or reject.
            </p>
            <Button onClick={handleMarkNewHospitalRaised} disabled={isSubmitting} className="mt-3">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Mark pre-auth raised for new hospital'
              )}
            </Button>
          </div>
        )}

        {/* Initiate Form Section */}
        {(!showMarkNewHospitalFirst || newHospitalMarked) && action === null && (
          <div>
              <InsuranceInitiateForm
                leadId={leadId}
                initialData={initiateFormData?.data?.initiateForm}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['insurance-initiate-form', leadId] })
                  toast.success('Initiate form saved successfully. You can now approve the pre-auth.')
                }}
              />
              

          </div>
        )}

        {/* Approve/Reject Actions */}
        {(!showMarkNewHospitalFirst || newHospitalMarked) && (
          <div className="space-y-4 border-t pt-4">
            {action === null && (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (!isInitiateFormFilled) {
                      toast.error('Please fill the initiate form before approving')
                      return
                    }
                    setAction('approve')
                  }}
                  className="flex-1"
                  variant="default"
                  size="lg"
                  disabled={!isInitiateFormFilled}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Pre-Auth
                </Button>
                <Button
                  onClick={() => setAction('reject')}
                  className="flex-1"
                  variant="destructive"
                  size="lg"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Pre-Auth
                </Button>
              </div>
            )}

            {action === 'approve' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Confirm approval of this pre-authorization?
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    This will move the case to the next stage and notify the BD team.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="flex-1"
                    variant="default"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Approval
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setAction(null)}
                    disabled={isSubmitting}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {action === 'reject' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Please provide a reason for rejecting this pre-authorization..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This reason will be communicated to the BD team.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    className="flex-1"
                    variant="destructive"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Confirm Rejection
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setAction(null)
                      setRejectionReason('')
                    }}
                    disabled={isSubmitting}
                    variant="outline"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
