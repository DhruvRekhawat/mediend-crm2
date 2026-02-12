'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface InsuranceInitiateFormProps {
  leadId: string
  onSuccess?: () => void
  initialData?: any
}

interface Lead {
  kypSubmission?: {
    preAuthData?: {
      copay?: string | null
      requestedRoomType?: string | null
      sumInsured?: string | null
    } | null
  } | null
}

export function InsuranceInitiateForm({ leadId, onSuccess, initialData }: InsuranceInitiateFormProps) {
  const { data: lead } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  // Initialize form data with autofilled values from pre-auth
  const [formData, setFormData] = useState(() => {
    const base = {
      totalBillAmount: '',
      discount: '',
      otherReductions: '',
      copay: '',
      copayBuffer: '',
      deductible: '',
      exceedsPolicyLimit: '',
      policyDeductibleAmount: '',
      totalAuthorizedAmount: '',
      amountToBePaidByInsurance: '',
      roomCategory: '',
    }

    // Autofill copay from pre-auth if available
    if (lead?.kypSubmission?.preAuthData?.copay) {
      const copayValue = lead.kypSubmission.preAuthData.copay.replace(/%/g, '').trim()
      base.copay = copayValue
    }

    // Autofill room category from pre-auth
    if (lead?.kypSubmission?.preAuthData?.requestedRoomType) {
      base.roomCategory = lead.kypSubmission.preAuthData.requestedRoomType
    }

    return base
  })

  const [submitting, setSubmitting] = useState(false)
  const initializedRef = useRef(false)

  // Update form data when lead becomes available
  useEffect(() => {
    if (!lead || initializedRef.current) return

    const preAuth = lead.kypSubmission?.preAuthData
    const copayFromPreAuth = preAuth?.copay != null && preAuth.copay !== '' 
      ? String(preAuth.copay).replace(/%/g, '').trim() 
      : ''
    const roomCategoryFromPreAuth = preAuth?.requestedRoomType || ''

    setFormData((prev) => ({
      ...prev,
      copay: copayFromPreAuth || prev.copay,
      roomCategory: roomCategoryFromPreAuth || prev.roomCategory,
    }))

    initializedRef.current = true
  }, [lead])

  // Update form data when initialData is provided (for editing)
  useEffect(() => {
    if (initialData && !initializedRef.current) {
      setFormData({
        totalBillAmount: initialData.totalBillAmount != null ? String(initialData.totalBillAmount) : '',
        discount: initialData.discount != null ? String(initialData.discount) : '',
        otherReductions: initialData.otherReductions != null ? String(initialData.otherReductions) : '',
        copay: initialData.copay != null ? String(initialData.copay) : '',
        copayBuffer: initialData.copayBuffer != null ? String(initialData.copayBuffer) : '',
        deductible: initialData.deductible != null ? String(initialData.deductible) : '',
        exceedsPolicyLimit: initialData.exceedsPolicyLimit || '',
        policyDeductibleAmount: initialData.policyDeductibleAmount != null ? String(initialData.policyDeductibleAmount) : '',
        totalAuthorizedAmount: initialData.totalAuthorizedAmount != null ? String(initialData.totalAuthorizedAmount) : '',
        amountToBePaidByInsurance: initialData.amountToBePaidByInsurance != null ? String(initialData.amountToBePaidByInsurance) : '',
        roomCategory: initialData.roomCategory || '',
      })
      initializedRef.current = true
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload = {
        leadId,
        totalBillAmount: parseFloat(formData.totalBillAmount) || 0,
        discount: parseFloat(formData.discount) || 0,
        otherReductions: parseFloat(formData.otherReductions) || 0,
        copay: formData.copay ? parseFloat(formData.copay) : null,
        copayBuffer: parseFloat(formData.copayBuffer) || 0,
        deductible: parseFloat(formData.deductible) || 0,
        exceedsPolicyLimit: formData.exceedsPolicyLimit || undefined,
        policyDeductibleAmount: parseFloat(formData.policyDeductibleAmount) || 0,
        totalAuthorizedAmount: parseFloat(formData.totalAuthorizedAmount) || 0,
        amountToBePaidByInsurance: parseFloat(formData.amountToBePaidByInsurance) || 0,
        roomCategory: formData.roomCategory || undefined,
      }

      if (initialData) {
        await apiPatch(`/api/insurance-initiate-form/${initialData.id}`, payload)
        toast.success('Initiate form updated successfully')
      } else {
        await apiPost('/api/insurance-initiate-form', payload)
        toast.success('Initiate form created successfully')
      }

      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save initiate form')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance Initiate Form</CardTitle>
        <CardDescription>
          Fill in the financial details before patient admission. This form is a predecessor of the discharge form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalBillAmount">Total Bill Amount *</Label>
              <Input
                id="totalBillAmount"
                type="number"
                step="0.01"
                value={formData.totalBillAmount}
                onChange={(e) => updateField('totalBillAmount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(e) => updateField('discount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="otherReductions">Other Reductions</Label>
              <Input
                id="otherReductions"
                type="number"
                step="0.01"
                value={formData.otherReductions}
                onChange={(e) => updateField('otherReductions', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="copay">Co-pay *</Label>
              <Input
                id="copay"
                type="number"
                step="0.01"
                value={formData.copay}
                onChange={(e) => updateField('copay', e.target.value)}
                placeholder="Autofilled from pre-auth"
                required
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Autofilled from pre-authorization</p>
            </div>

            <div>
              <Label htmlFor="copayBuffer">Co-pay Buffer</Label>
              <Input
                id="copayBuffer"
                type="number"
                step="0.01"
                value={formData.copayBuffer}
                onChange={(e) => updateField('copayBuffer', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="deductible">Deductible</Label>
              <Input
                id="deductible"
                type="number"
                step="0.01"
                value={formData.deductible}
                onChange={(e) => updateField('deductible', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="exceedsPolicyLimit">Exceeds Policy Limit</Label>
              <Input
                id="exceedsPolicyLimit"
                type="text"
                value={formData.exceedsPolicyLimit}
                onChange={(e) => updateField('exceedsPolicyLimit', e.target.value)}
                placeholder="Enter text"
              />
            </div>

            <div>
              <Label htmlFor="policyDeductibleAmount">Policy Deductible Amount</Label>
              <Input
                id="policyDeductibleAmount"
                type="number"
                step="0.01"
                value={formData.policyDeductibleAmount}
                onChange={(e) => updateField('policyDeductibleAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="totalAuthorizedAmount">Total Authorized Amount</Label>
              <Input
                id="totalAuthorizedAmount"
                type="number"
                step="0.01"
                value={formData.totalAuthorizedAmount}
                onChange={(e) => updateField('totalAuthorizedAmount', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="amountToBePaidByInsurance">Amount to be Paid by Insurance</Label>
              <Input
                id="amountToBePaidByInsurance"
                type="number"
                step="0.01"
                value={formData.amountToBePaidByInsurance}
                onChange={(e) => updateField('amountToBePaidByInsurance', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="roomCategory">Room Category</Label>
              <Input
                id="roomCategory"
                type="text"
                value={formData.roomCategory}
                onChange={(e) => updateField('roomCategory', e.target.value)}
                placeholder="Autofilled from pre-auth"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Autofilled from pre-authorization</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess?.()}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                initialData ? 'Update Form' : 'Save Form'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
