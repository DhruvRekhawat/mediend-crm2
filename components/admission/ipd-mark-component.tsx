'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { CheckCircle, Pause, XCircle, LogOut, AlertCircle } from 'lucide-react'

interface IPDStatusHistory {
  status: string
  date: string
  reason?: string
  notes?: string
}

interface IPDMarkComponentProps {
  leadId: string
  currentStatus?: string
  statusHistory?: IPDStatusHistory[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function IPDMarkComponent({
  leadId,
  currentStatus,
  statusHistory = [],
  onSuccess,
  onCancel,
}: IPDMarkComponentProps) {
  const [selectedStatus, setSelectedStatus] = useState<'ADMITTED_DONE' | 'POSTPONED' | 'CANCELLED' | 'DISCHARGED' | null>(null)
  const [formData, setFormData] = useState({
    reason: '',
    newSurgeryDate: '',
    dischargeDate: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const statusOptions = [
    {
      value: 'ADMITTED_DONE' as const,
      label: 'Surgery Done',
      icon: CheckCircle,
      color: 'bg-green-100 dark:bg-green-900 border-green-300',
      description: 'Surgery has been completed successfully',
    },
    {
      value: 'POSTPONED' as const,
      label: 'Postponed',
      icon: Pause,
      color: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300',
      description: 'Surgery has been postponed to a later date',
    },
    {
      value: 'CANCELLED' as const,
      label: 'Cancelled',
      icon: XCircle,
      color: 'bg-red-100 dark:bg-red-900 border-red-300',
      description: 'Surgery has been cancelled',
    },
    {
      value: 'DISCHARGED' as const,
      label: 'Discharged',
      icon: LogOut,
      color: 'bg-blue-100 dark:bg-blue-900 border-blue-300',
      description: 'Patient has been discharged',
    },
  ]

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!selectedStatus) {
      newErrors.status = 'Please select an IPD status'
    }

    if (selectedStatus === 'POSTPONED') {
      if (!formData.reason.trim()) newErrors.reason = 'Reason for postponement is required'
      if (!formData.newSurgeryDate) newErrors.newSurgeryDate = 'New surgery date is required'
    }

    if (selectedStatus === 'CANCELLED') {
      if (!formData.reason.trim()) newErrors.reason = 'Reason for cancellation is required'
    }

    if (selectedStatus === 'DISCHARGED') {
      if (!formData.dischargeDate) newErrors.dischargeDate = 'Discharge date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors')
      return
    }

    setIsSubmitting(true)
    try {
      await apiPost(`/api/leads/${leadId}/ipd-mark`, {
        status: selectedStatus,
        reason: formData.reason.trim() || undefined,
        newSurgeryDate: selectedStatus === 'POSTPONED' ? formData.newSurgeryDate : undefined,
        dischargeDate: selectedStatus === 'DISCHARGED' ? formData.dischargeDate : undefined,
        notes: formData.notes.trim() || undefined,
      })

      toast.success(`IPD status marked as ${selectedStatus}`)
      setShowConfirm(false)
      setSelectedStatus(null)
      setFormData({ reason: '', newSurgeryDate: '', dischargeDate: '', notes: '' })
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark IPD status')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showConfirm && selectedStatus) {
    const option = statusOptions.find(o => o.value === selectedStatus)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold">Confirm IPD Status Change</h3>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded mb-4">
            <p className="text-sm">
              <span className="font-medium">Status: </span>
              <span>{option?.label}</span>
            </p>
            {selectedStatus === 'POSTPONED' && (
              <>
                <p className="text-sm mt-2"><span className="font-medium">Reason: </span>{formData.reason}</p>
                <p className="text-sm"><span className="font-medium">New Surgery Date: </span>{formData.newSurgeryDate}</p>
              </>
            )}
            {selectedStatus === 'CANCELLED' && (
              <p className="text-sm mt-2"><span className="font-medium">Reason: </span>{formData.reason}</p>
            )}
            {selectedStatus === 'DISCHARGED' && (
              <p className="text-sm mt-2"><span className="font-medium">Discharge Date: </span>{formData.dischargeDate}</p>
            )}
            {formData.notes && (
              <p className="text-sm mt-2"><span className="font-medium">Notes: </span>{formData.notes}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select IPD Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statusOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(option.value)
                  setFormData({ reason: '', newSurgeryDate: '', dischargeDate: '', notes: '' })
                }}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedStatus === option.value
                    ? `${option.color} border-current`
                    : `${option.color} border-transparent hover:border-current`
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        {errors.status && <p className="text-xs text-destructive mt-2">{errors.status}</p>}
      </div>

      {selectedStatus === 'ADMITTED_DONE' && (
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Surgery Completed</h4>
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any remarks or observations"
              rows={2}
            />
          </div>
        </div>
      )}

      {selectedStatus === 'POSTPONED' && (
        <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg space-y-4">
          <h4 className="font-semibold">Surgery Postponed Details</h4>
          <div>
            <Label htmlFor="reason">Reason for Postponement *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why surgery is being postponed"
              required
              rows={2}
            />
            {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason}</p>}
          </div>
          <div>
            <Label htmlFor="newSurgeryDate">New Surgery Date *</Label>
            <Input
              id="newSurgeryDate"
              type="date"
              value={formData.newSurgeryDate}
              onChange={(e) => setFormData({ ...formData, newSurgeryDate: e.target.value })}
              required
            />
            {errors.newSurgeryDate && <p className="text-xs text-destructive mt-1">{errors.newSurgeryDate}</p>}
          </div>
          <div>
            <Label htmlFor="notes2">Additional Notes (Optional)</Label>
            <Textarea
              id="notes2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information"
              rows={2}
            />
          </div>
        </div>
      )}

      {selectedStatus === 'CANCELLED' && (
        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg space-y-4">
          <h4 className="font-semibold">Cancellation Details</h4>
          <div>
            <Label htmlFor="cancelReason">Reason for Cancellation *</Label>
            <Textarea
              id="cancelReason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why surgery is being cancelled"
              required
              rows={2}
            />
            {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason}</p>}
          </div>
          <div>
            <Label htmlFor="cancelNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="cancelNotes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information"
              rows={2}
            />
          </div>
        </div>
      )}

      {selectedStatus === 'DISCHARGED' && (
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-4">
          <h4 className="font-semibold">Discharge Details</h4>
          <div>
            <Label htmlFor="dischargeDate">Discharge Date *</Label>
            <Input
              id="dischargeDate"
              type="date"
              value={formData.dischargeDate}
              onChange={(e) => setFormData({ ...formData, dischargeDate: e.target.value })}
              required
            />
            {errors.dischargeDate && <p className="text-xs text-destructive mt-1">{errors.dischargeDate}</p>}
          </div>
          <div>
            <Label htmlFor="dischargeNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="dischargeNotes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any remarks or observations"
              rows={2}
            />
          </div>
        </div>
      )}

      {statusHistory && statusHistory.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Status History</h4>
          <div className="space-y-2">
            {statusHistory.map((record, idx) => (
              <div key={idx} className="text-sm border-l-2 border-gray-300 pl-3 py-1">
                <p className="font-medium">{record.status}</p>
                <p className="text-gray-600 dark:text-gray-400">{record.date}</p>
                {record.reason && <p className="text-xs">{record.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {selectedStatus && (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Continue'}
          </Button>
        )}
      </div>
    </div>
  )
}
