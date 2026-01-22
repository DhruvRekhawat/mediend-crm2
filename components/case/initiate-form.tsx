'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InitiateFormProps {
  leadId: string
  initialData?: {
    admittingHospital?: string
    admissionDate?: string
    admissionTime?: string
    expectedSurgeryDate?: string
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function InitiateForm({
  leadId,
  initialData,
  onSuccess,
  onCancel,
}: InitiateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    admissionDate: initialData?.admissionDate || '',
    admissionTime: initialData?.admissionTime || '',
    admittingHospital: initialData?.admittingHospital || '',
    expectedSurgeryDate: initialData?.expectedSurgeryDate || '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/leads/${leadId}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admissionDate: formData.admissionDate,
          admissionTime: formData.admissionTime,
          admittingHospital: formData.admittingHospital,
          expectedSurgeryDate: formData.expectedSurgeryDate,
          notes: formData.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate admission')
      }

      toast.success('Patient admitted successfully')
      onSuccess?.()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate admission')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admit Patient</CardTitle>
        <CardDescription>
          Mark patient as admitted and provide admission details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admissionDate">Admission Date *</Label>
            <Input
              id="admissionDate"
              type="date"
              value={formData.admissionDate}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, admissionDate: e.target.value }))
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="admissionTime">Admission Time</Label>
            <Input
              id="admissionTime"
              type="time"
              value={formData.admissionTime}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, admissionTime: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="admittingHospital">Admitting Hospital *</Label>
            <Input
              id="admittingHospital"
              value={formData.admittingHospital}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, admittingHospital: e.target.value }))
              }
              placeholder="Enter hospital name"
              required
            />
          </div>
          <div>
            <Label htmlFor="expectedSurgeryDate">Expected Surgery Date</Label>
            <Input
              id="expectedSurgeryDate"
              type="date"
              value={formData.expectedSurgeryDate}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, expectedSurgeryDate: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any additional notes"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Admitting...' : 'Admit Patient'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
