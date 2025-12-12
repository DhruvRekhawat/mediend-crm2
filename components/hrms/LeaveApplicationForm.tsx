'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

interface LeaveType {
  id: string
  name: string
  maxDays: number
  isActive: boolean
}

interface LeaveApplicationFormProps {
  leaveTypes: LeaveType[]
  onSubmit: (data: {
    leaveTypeId: string
    startDate: Date
    endDate: Date
    reason?: string
  }) => void
  isLoading?: boolean
}

export function LeaveApplicationForm({
  leaveTypes,
  onSubmit,
  isLoading = false,
}: LeaveApplicationFormProps) {
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      return
    }
    onSubmit({
      leaveTypeId: formData.leaveTypeId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason || undefined,
    })
    // Reset form
    setFormData({
      leaveTypeId: '',
      startDate: undefined,
      endDate: undefined,
      reason: '',
    })
  }

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0
    const diffTime = formData.endDate.getTime() - formData.startDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }

  const activeLeaveTypes = leaveTypes?.filter((lt) => lt.isActive) || []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Leave Type</Label>
        {activeLeaveTypes.length === 0 ? (
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded border">
            No leave types available. Please contact HR to set up leave types.
          </div>
        ) : (
          <Select
            value={formData.leaveTypeId}
            onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              {activeLeaveTypes.map((leaveType) => (
                <SelectItem key={leaveType.id} value={leaveType.id}>
                  {leaveType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              if (e.target.value) {
                setFormData({ ...formData, startDate: new Date(e.target.value) })
              }
            }}
            required
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>

        <div>
          <Label>End Date</Label>
          <Input
            type="date"
            value={formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              if (e.target.value) {
                setFormData({ ...formData, endDate: new Date(e.target.value) })
              }
            }}
            required
            min={formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
      </div>

      {formData.startDate && formData.endDate && (
        <div>
          <Label>Total Days</Label>
          <Input value={`${calculateDays()} days`} disabled />
        </div>
      )}

      <div>
        <Label>Reason (Optional)</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Enter reason for leave..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !formData.leaveTypeId || !formData.startDate || !formData.endDate}>
          {isLoading ? 'Submitting...' : 'Apply for Leave'}
        </Button>
      </div>
    </form>
  )
}

