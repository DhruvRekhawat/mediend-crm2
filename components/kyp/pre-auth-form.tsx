'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface PreAuthFormProps {
  kypSubmissionId: string
  initialData?: {
    sumInsured?: string | null
    roomRent?: string | null
    capping?: string | null
    copay?: string | null
    icu?: string | null
    hospitalNameSuggestion?: string | null
    insurance?: string | null
    tpa?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
  isReadOnly?: boolean // Disable editing if follow-up is complete
}

export function PreAuthForm({
  kypSubmissionId,
  initialData,
  onSuccess,
  onCancel,
  isReadOnly = false,
}: PreAuthFormProps) {
  const [formData, setFormData] = useState({
    sumInsured: initialData?.sumInsured || '',
    roomRent: initialData?.roomRent || '',
    capping: initialData?.capping || '',
    copay: initialData?.copay || '',
    icu: initialData?.icu || '',
    hospitalNameSuggestion: initialData?.hospitalNameSuggestion || '',
    insurance: initialData?.insurance || '',
    tpa: initialData?.tpa || '',
  })

  const [submitting, setSubmitting] = useState(false)

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        sumInsured: initialData.sumInsured || '',
        roomRent: initialData.roomRent || '',
        capping: initialData.capping || '',
        copay: initialData.copay || '',
        icu: initialData.icu || '',
        hospitalNameSuggestion: initialData.hospitalNameSuggestion || '',
        insurance: initialData.insurance || '',
        tpa: initialData.tpa || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await apiPost('/api/kyp/pre-auth', {
        kypSubmissionId,
        ...formData,
      })

      toast.success('Pre-authorization submitted successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit pre-authorization')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sumInsured">Sum Insured</Label>
          <Input
            id="sumInsured"
            value={formData.sumInsured}
            onChange={(e) => setFormData({ ...formData, sumInsured: e.target.value })}
            placeholder="Enter sum insured"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="roomRent">Room Rent</Label>
          <Input
            id="roomRent"
            value={formData.roomRent}
            onChange={(e) => setFormData({ ...formData, roomRent: e.target.value })}
            placeholder="Enter room rent"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="capping">Capping</Label>
          <Input
            id="capping"
            value={formData.capping}
            onChange={(e) => setFormData({ ...formData, capping: e.target.value })}
            placeholder="Enter capping"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="copay">Copay</Label>
          <Input
            id="copay"
            value={formData.copay}
            onChange={(e) => setFormData({ ...formData, copay: e.target.value })}
            placeholder="Enter copay"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="icu">ICU</Label>
          <Input
            id="icu"
            value={formData.icu}
            onChange={(e) => setFormData({ ...formData, icu: e.target.value })}
            placeholder="Enter ICU details"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="hospitalNameSuggestion">Hospital Name Suggestion</Label>
          <Input
            id="hospitalNameSuggestion"
            value={formData.hospitalNameSuggestion}
            onChange={(e) =>
              setFormData({ ...formData, hospitalNameSuggestion: e.target.value })
            }
            placeholder="Enter hospital name suggestion"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="insurance">Insurance</Label>
          <Input
            id="insurance"
            value={formData.insurance}
            onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
            placeholder="Enter insurance company"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <Label htmlFor="tpa">TPA</Label>
          <Input
            id="tpa"
            value={formData.tpa}
            onChange={(e) => setFormData({ ...formData, tpa: e.target.value })}
            placeholder="Enter TPA"
            disabled={isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
      </div>

      {isReadOnly && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Pre-authorization cannot be edited once follow-up has been completed.
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
        )}
        {!isReadOnly && (
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Pre-Authorization'}
          </Button>
        )}
      </div>
    </form>
  )
}
