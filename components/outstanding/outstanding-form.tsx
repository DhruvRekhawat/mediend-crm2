'use client'

import { useState, useEffect } from 'react'
import { apiPatch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface OutstandingFormProps {
  outstandingCase: any
  onSuccess?: () => void
}

export function OutstandingForm({ outstandingCase, onSuccess }: OutstandingFormProps) {
  const [formData, setFormData] = useState({
    paymentReceived: outstandingCase.paymentReceived || false,
    settlementAmount: outstandingCase.settlementAmount?.toString() || '',
    remarks: outstandingCase.remarks || '',
    remark2: outstandingCase.remark2 || '',
  })

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await apiPatch(`/api/outstanding/${outstandingCase.id}`, {
        paymentReceived: formData.paymentReceived,
        settlementAmount: parseFloat(formData.settlementAmount) || 0,
        remarks: formData.remarks,
        remark2: formData.remark2,
      })

      toast.success('Outstanding case updated successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update outstanding case')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Payment Status</CardTitle>
        <CardDescription>
          {outstandingCase.lead?.leadRef} - {outstandingCase.patientName || outstandingCase.lead?.patientName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="paymentReceived"
              checked={formData.paymentReceived}
              onCheckedChange={(checked) => setFormData({ ...formData, paymentReceived: !!checked })}
            />
            <Label htmlFor="paymentReceived">Payment Received</Label>
          </div>

          <div>
            <Label htmlFor="settlementAmount">Settlement Amount</Label>
            <Input
              id="settlementAmount"
              type="number"
              step="0.01"
              value={formData.settlementAmount}
              onChange={(e) => setFormData({ ...formData, settlementAmount: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="remark2">Follow-up Remarks</Label>
            <Textarea
              id="remark2"
              value={formData.remark2}
              onChange={(e) => setFormData({ ...formData, remark2: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
