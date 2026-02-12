'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MultiStepForm } from '@/components/forms/multi-step-form'
import { toast } from 'sonner'
import { useFileUpload } from '@/hooks/use-file-upload'

interface DischargeSheetFormProps {
  leadId: string
  onSuccess?: () => void
  initialData?: any
}

interface Lead {
  patientName?: string
  phoneNumber?: string
  surgeonName?: string
  hospitalName?: string
  category?: string
  treatment?: string
  circle?: string
  source?: string
  billAmount?: number
  implantAmount?: number
  surgeryDate?: string | Date
  kypSubmission?: {
    preAuthData?: {
      sumInsured?: string | null
      roomRent?: string | null
      copay?: string | null
      requestedHospitalName?: string | null
      suggestedHospitals?: Array<{
        hospitalName?: string | null
        tentativeBill?: number | null
      }> | null
    } | null
  } | null
}

export function DischargeSheetForm({ leadId, onSuccess, initialData }: DischargeSheetFormProps) {
  const { data: lead } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const { uploadFile, uploading: isUploading } = useFileUpload({ folder: 'discharge' })

  // Use lazy initializer to compute initial state from lead and initialData
  const [formData, setFormData] = useState(() => {
    const base = {
      // Core Identification
      month: '',
      dischargeDate: '',
      surgeryDate: '',
      status: '',
      paymentType: '',
      approvedOrCash: '',
      paymentCollectedAt: '',
      // People & Ownership
      managerRole: '',
      managerName: '',
      bdmName: '',
      patientName: '',
      patientPhone: '',
      doctorName: '',
      hospitalName: '',
      // Case Details
      category: '',
      treatment: '',
      circle: '',
      leadSource: '',
      sumInsured: '',
      roomRentCap: '',
      tentativeAmount: '',
      copayPct: '',
      dischargeSummaryUrl: '',
      otNotesUrl: '',
      codesCount: '',
      finalBillUrl: '',
      settlementLetterUrl: '',
      roomRentAmount: '',
      pharmacyAmount: '',
      investigationAmount: '',
      consumablesAmount: '',
      implantsAmount: '',
      totalFinalBill: '',
      finalApprovedAmount: '',
      deductionAmount: '',
      discountAmount: '',
      waivedOffAmount: '',
      settlementPart: '',
      tdsAmount: '',
      otherDeduction: '',
      netSettlementAmount: '',
      // Financials
      totalAmount: '',
      billAmount: '',
      cashPaidByPatient: '',
      cashOrDedPaid: '',
      referralAmount: '',
      cabCharges: '',
      implantCost: '',
      dcCharges: '',
      doctorCharges: '',
      // Revenue Split
      hospitalSharePct: '',
      hospitalShareAmount: '',
      mediendSharePct: '',
      mediendShareAmount: '',
      mediendNetProfit: '',
      // Meta
      remarks: '',
    }

    // Note: lead and initialData may not be available on first render (from queries)
    // If they become available later, parent should use a key prop to remount component
    return base
  })

  const [submitting, setSubmitting] = useState(false)
  const initializedRef = useRef(false)
  // Only show MultiStepForm after we've populated formData from lead/initialData so it gets correct initial values
  const [formReady, setFormReady] = useState(false)

  // Update form data when lead or initialData becomes available (only once)
  useEffect(() => {
    if (!lead && !initialData) return
    if (initializedRef.current) return

    setFormData((prev) => {
      if (prev.patientName || prev.month) {
        initializedRef.current = true
        return prev
      }

      let updated = { ...prev }

      if (lead) {
        const preAuth = lead.kypSubmission?.preAuthData
        const requestedName = (preAuth?.requestedHospitalName as string)?.trim() || ''
        const suggested = preAuth?.suggestedHospitals || []
        const selectedHospital = requestedName
          ? suggested.find(
              (h) => (h.hospitalName || '').trim().toLowerCase() === requestedName.toLowerCase()
            )
          : suggested[0]
        const tentativeFromPreAuth =
          selectedHospital?.tentativeBill != null ? String(selectedHospital.tentativeBill) : ''
        const copayFromPreAuth =
          preAuth?.copay != null && preAuth.copay !== '' ? String(preAuth.copay).replace(/%/g, '').trim() : ''

        updated = {
          ...updated,
          patientName: lead.patientName || '',
          patientPhone: lead.phoneNumber || '',
          doctorName: lead.surgeonName || '',
          hospitalName: requestedName || lead.hospitalName || '',
          category: lead.category || '',
          treatment: lead.treatment || '',
          circle: lead.circle || '',
          leadSource: lead.source || '',
          billAmount: lead.billAmount?.toString() || '',
          implantCost: lead.implantAmount?.toString() || '',
          surgeryDate: lead.surgeryDate ? new Date(lead.surgeryDate).toISOString().split('T')[0] : '',
          status: 'Discharged',
          sumInsured: (preAuth?.sumInsured as string) ?? updated.sumInsured ?? '',
          roomRentCap: (preAuth?.roomRent as string) ?? updated.roomRentCap ?? '',
          tentativeAmount: tentativeFromPreAuth || updated.tentativeAmount,
          copayPct: copayFromPreAuth || updated.copayPct,
        }
      }

      if (initialData) {
        updated = {
          ...updated,
          ...initialData,
          month: initialData.month ? new Date(initialData.month).toISOString().split('T')[0] : (updated.month as string) ?? '',
          dischargeDate: initialData.dischargeDate ? new Date(initialData.dischargeDate).toISOString().split('T')[0] : (updated.dischargeDate as string) ?? '',
          surgeryDate: initialData.surgeryDate ? new Date(initialData.surgeryDate).toISOString().split('T')[0] : (updated.surgeryDate as string) ?? '',
          tentativeAmount: (initialData.tentativeAmount != null ? String(initialData.tentativeAmount) : updated.tentativeAmount) ?? '',
          copayPct: (initialData.copayPct != null ? String(initialData.copayPct) : updated.copayPct) ?? '',
          dischargeSummaryUrl: initialData.dischargeSummaryUrl ?? updated.dischargeSummaryUrl ?? '',
          otNotesUrl: initialData.otNotesUrl ?? updated.otNotesUrl ?? '',
          codesCount: (initialData.codesCount != null ? String(initialData.codesCount) : updated.codesCount) ?? '',
          finalBillUrl: initialData.finalBillUrl ?? updated.finalBillUrl ?? '',
          settlementLetterUrl: initialData.settlementLetterUrl ?? updated.settlementLetterUrl ?? '',
          roomRentAmount: (initialData.roomRentAmount != null ? String(initialData.roomRentAmount) : updated.roomRentAmount) ?? '',
          pharmacyAmount: (initialData.pharmacyAmount != null ? String(initialData.pharmacyAmount) : updated.pharmacyAmount) ?? '',
          investigationAmount: (initialData.investigationAmount != null ? String(initialData.investigationAmount) : updated.investigationAmount) ?? '',
          consumablesAmount: (initialData.consumablesAmount != null ? String(initialData.consumablesAmount) : updated.consumablesAmount) ?? '',
          implantsAmount: (initialData.implantsAmount != null ? String(initialData.implantsAmount) : updated.implantsAmount) ?? '',
          totalFinalBill: (initialData.totalFinalBill != null ? String(initialData.totalFinalBill) : updated.totalFinalBill) ?? '',
          finalApprovedAmount: (initialData.finalApprovedAmount != null ? String(initialData.finalApprovedAmount) : updated.finalApprovedAmount) ?? '',
          deductionAmount: (initialData.deductionAmount != null ? String(initialData.deductionAmount) : updated.deductionAmount) ?? '',
          discountAmount: (initialData.discountAmount != null ? String(initialData.discountAmount) : updated.discountAmount) ?? '',
          waivedOffAmount: (initialData.waivedOffAmount != null ? String(initialData.waivedOffAmount) : updated.waivedOffAmount) ?? '',
          settlementPart: (initialData.settlementPart != null ? String(initialData.settlementPart) : updated.settlementPart) ?? '',
          tdsAmount: (initialData.tdsAmount != null ? String(initialData.tdsAmount) : updated.tdsAmount) ?? '',
          otherDeduction: (initialData.otherDeduction != null ? String(initialData.otherDeduction) : updated.otherDeduction) ?? '',
          netSettlementAmount: (initialData.netSettlementAmount != null ? String(initialData.netSettlementAmount) : updated.netSettlementAmount) ?? '',
        }
      }

      initializedRef.current = true
      return updated
    })
    setFormReady(true)
  }, [lead, initialData])

  const handleSubmit = async () => {
    try {
      // Use formData from component state (steps update this directly)
      const finalData = formData
      
      const payload: any = {
        leadId,
        month: finalData.month ? (finalData.month as string) : undefined,
        dischargeDate: finalData.dischargeDate ? (finalData.dischargeDate as string) : undefined,
        surgeryDate: finalData.surgeryDate ? (finalData.surgeryDate as string) : undefined,
        status: finalData.status || '',
        paymentType: finalData.paymentType || '',
        approvedOrCash: finalData.approvedOrCash || '',
        paymentCollectedAt: finalData.paymentCollectedAt || '',
        managerRole: finalData.managerRole || '',
        managerName: finalData.managerName || '',
        bdmName: finalData.bdmName || '',
        patientName: finalData.patientName || '',
        patientPhone: finalData.patientPhone || '',
        doctorName: finalData.doctorName || '',
        hospitalName: finalData.hospitalName || '',
        category: finalData.category || '',
        treatment: finalData.treatment || '',
        circle: finalData.circle || '',
        leadSource: finalData.leadSource || '',
        totalAmount: parseFloat(finalData.totalAmount as string) || parseFloat(finalData.totalFinalBill as string) || 0,
        billAmount: parseFloat(finalData.billAmount as string) || parseFloat(finalData.totalFinalBill as string) || 0,
        cashPaidByPatient: parseFloat(finalData.cashPaidByPatient as string) || 0,
        cashOrDedPaid: parseFloat(finalData.cashOrDedPaid as string) || 0,
        referralAmount: parseFloat(finalData.referralAmount as string) || 0,
        cabCharges: parseFloat(finalData.cabCharges as string) || 0,
        implantCost: parseFloat(finalData.implantCost as string) || 0,
        dcCharges: parseFloat(finalData.dcCharges as string) || 0,
        doctorCharges: parseFloat(finalData.doctorCharges as string) || 0,
        hospitalSharePct: finalData.hospitalSharePct ? parseFloat(finalData.hospitalSharePct as string) : undefined,
        hospitalShareAmount: parseFloat(finalData.hospitalShareAmount as string) || 0,
        mediendSharePct: finalData.mediendSharePct ? parseFloat(finalData.mediendSharePct as string) : undefined,
        mediendShareAmount: parseFloat(finalData.mediendShareAmount as string) || 0,
        mediendNetProfit: parseFloat(finalData.mediendNetProfit as string) || 0,
        remarks: finalData.remarks || '',
        tentativeAmount: finalData.tentativeAmount ? parseFloat(finalData.tentativeAmount as string) : undefined,
        copayPct: finalData.copayPct ? parseFloat(finalData.copayPct as string) : undefined,
        dischargeSummaryUrl: (finalData.dischargeSummaryUrl as string) || undefined,
        otNotesUrl: (finalData.otNotesUrl as string) || undefined,
        codesCount: finalData.codesCount ? parseInt(finalData.codesCount as string, 10) : undefined,
        finalBillUrl: (finalData.finalBillUrl as string) || undefined,
        settlementLetterUrl: (finalData.settlementLetterUrl as string) || undefined,
        roomRentAmount: parseFloat(finalData.roomRentAmount as string) || 0,
        pharmacyAmount: parseFloat(finalData.pharmacyAmount as string) || 0,
        investigationAmount: parseFloat(finalData.investigationAmount as string) || 0,
        consumablesAmount: parseFloat(finalData.consumablesAmount as string) || 0,
        implantsAmount: parseFloat(finalData.implantsAmount as string) || 0,
        totalFinalBill: parseFloat(finalData.totalFinalBill as string) || 0,
        finalApprovedAmount: parseFloat(finalData.finalApprovedAmount as string) || 0,
        deductionAmount: parseFloat(finalData.deductionAmount as string) || 0,
        discountAmount: parseFloat(finalData.discountAmount as string) || 0,
        waivedOffAmount: parseFloat(finalData.waivedOffAmount as string) || 0,
        settlementPart: parseFloat(finalData.settlementPart as string) || 0,
        tdsAmount: parseFloat(finalData.tdsAmount as string) || 0,
        otherDeduction: parseFloat(finalData.otherDeduction as string) || 0,
        netSettlementAmount: parseFloat(finalData.netSettlementAmount as string) || 0,
      }

      if (initialData) {
        await apiPatch(`/api/discharge-sheet/${initialData.id}`, payload)
        toast.success('Discharge sheet updated successfully')
      } else {
        await apiPost('/api/discharge-sheet', payload)
        toast.success('Discharge sheet created successfully')
      }

      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save discharge sheet')
      throw error
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      
      // Calculate derived values when relevant fields change
      const billAmount = parseFloat(updated.billAmount as string) || 0
      const hospitalSharePct = parseFloat(updated.hospitalSharePct as string) || 0
      const mediendSharePct = parseFloat(updated.mediendSharePct as string) || 0
      
      // Calculate hospital share amount
      if (billAmount > 0 && hospitalSharePct > 0) {
        updated.hospitalShareAmount = ((billAmount * hospitalSharePct) / 100).toFixed(2)
      }
      
      // Calculate mediend share amount
      if (billAmount > 0 && mediendSharePct > 0) {
        updated.mediendShareAmount = ((billAmount * mediendSharePct) / 100).toFixed(2)
      }
      
      // Calculate net profit
      const mediendShareAmount = parseFloat(updated.mediendShareAmount as string) || 0
      const totalCosts = (parseFloat(updated.referralAmount as string) || 0) +
                        (parseFloat(updated.cabCharges as string) || 0) +
                        (parseFloat(updated.implantCost as string) || 0) +
                        (parseFloat(updated.dcCharges as string) || 0) +
                        (parseFloat(updated.doctorCharges as string) || 0)
      updated.mediendNetProfit = (mediendShareAmount - totalCosts).toFixed(2)
      
      return updated
    })
  }

  const steps = [
    {
      id: 'policy',
      title: 'A. Patient & Policy Details',
      description: 'Policy and patient information',
      component: ({ formData: stepData, updateFormData }: { formData: Record<string, unknown>; updateFormData: (data: Partial<Record<string, unknown>>) => void }) => {
        const currentData = { ...formData, ...stepData }
        const updateBoth = (data: Partial<Record<string, unknown>>) => {
          updateFormData(data)
          setFormData(prev => ({ ...prev, ...data }))
        }
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sumInsured">Sum Insured</Label>
                <Input
                  id="sumInsured"
                  value={(currentData.sumInsured as string) || ''}
                  onChange={(e) => updateBoth({ sumInsured: e.target.value })}
                  placeholder="From pre-auth"
                />
              </div>
              <div>
                <Label htmlFor="hospitalName">Hospital Name</Label>
                <Input
                  id="hospitalName"
                  value={(currentData.hospitalName as string) || ''}
                  onChange={(e) => updateBoth({ hospitalName: e.target.value })}
                  placeholder="Admitting / discharge hospital"
                />
              </div>
              <div>
                <Label htmlFor="roomRentCap">Room Rent (Cap)</Label>
                <Input
                  id="roomRentCap"
                  value={(currentData.roomRentCap as string) || ''}
                  onChange={(e) => updateBoth({ roomRentCap: e.target.value })}
                  placeholder="From pre-auth"
                />
              </div>
              <div>
                <Label htmlFor="copayPct">Copay %</Label>
                <Input
                  id="copayPct"
                  type="number"
                  step="0.01"
                  value={(currentData.copayPct as string) || ''}
                  onChange={(e) => updateBoth({ copayPct: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="doctorName">Doctor Name</Label>
                <Input
                  id="doctorName"
                  value={(currentData.doctorName as string) || ''}
                  onChange={(e) => updateBoth({ doctorName: e.target.value })}
                  placeholder="Treating doctor"
                />
              </div>
              <div>
                <Label htmlFor="tentativeAmount">Tentative Amount</Label>
                <Input
                  id="tentativeAmount"
                  type="number"
                  step="0.01"
                  value={(currentData.tentativeAmount as string) || ''}
                  onChange={(e) => updateBoth({ tentativeAmount: e.target.value })}
                  placeholder="From pre-auth"
                />
              </div>
              <div>
                <Label htmlFor="dischargeDate">Discharge Date *</Label>
                <Input
                  id="dischargeDate"
                  type="date"
                  value={(currentData.dischargeDate as string) || ''}
                  onChange={(e) => updateBoth({ dischargeDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="surgeryDate">Surgery Date</Label>
                <Input
                  id="surgeryDate"
                  type="date"
                  value={(currentData.surgeryDate as string) || ''}
                  onChange={(e) => updateBoth({ surgeryDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        )
      },
      validate: () => (formData.dischargeDate as string)?.length > 0,
    },
    {
      id: 'documents',
      title: 'B. Documents Section',
      description: 'Discharge Summary, OT Notes, Codes Count, Final Bill, Settlement Letter',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'dischargeSummaryUrl', label: 'Discharge Summary' },
              { key: 'otNotesUrl', label: 'OT Notes' },
              { key: 'finalBillUrl', label: 'Final Bill' },
              { key: 'settlementLetterUrl', label: 'Settlement Letter' },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="flex-1"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const result = await uploadFile(file)
                        if (result) setFormData(prev => ({ ...prev, [key]: result.url }))
                      }
                    }}
                    disabled={isUploading}
                  />
                  {(formData[key as keyof typeof formData] as string) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(formData[key as keyof typeof formData] as string, '_blank')}
                    >
                      View
                    </Button>
                  )}
                </div>
                {(formData[key as keyof typeof formData] as string) && (
                  <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
                )}
              </div>
            ))}
            <div>
              <Label htmlFor="codesCount">Codes Count</Label>
              <Input
                id="codesCount"
                type="number"
                value={formData.codesCount as string}
                onChange={(e) => setFormData(prev => ({ ...prev, codesCount: e.target.value }))}
                placeholder="Optional"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'billbreakup',
      title: 'C. Bill Breakup Table',
      description: 'Head | Amount',
      component: (
        <div className="space-y-4">
          <div className="rounded-md border">
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 font-medium text-sm">
              <span>Head</span>
              <span>Amount</span>
            </div>
            {[
              { key: 'roomRentAmount', label: 'Room Rent' },
              { key: 'pharmacyAmount', label: 'Pharmacy' },
              { key: 'investigationAmount', label: 'Investigation' },
              { key: 'consumablesAmount', label: 'Consumables' },
              { key: 'implantsAmount', label: 'Implants' },
              { key: 'totalFinalBill', label: 'Total Final Bill' },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-2 p-3 border-t">
                <Label htmlFor={key} className="text-sm flex items-center">{label}</Label>
                <Input
                  id={key}
                  type="number"
                  step="0.01"
                  value={(formData[key as keyof typeof formData] as string) || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData(prev => {
                      const next = { ...prev, [key]: val }
                      const total =
                        (parseFloat(next.roomRentAmount as string) || 0) +
                        (parseFloat(next.pharmacyAmount as string) || 0) +
                        (parseFloat(next.investigationAmount as string) || 0) +
                        (parseFloat(next.consumablesAmount as string) || 0) +
                        (parseFloat(next.implantsAmount as string) || 0)
                      next.totalFinalBill = total > 0 ? String(total) : next.totalFinalBill
                      return next
                    })
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'approval',
      title: 'D. Approval & Deductions Table',
      description: 'Item | Amount',
      component: (
        <div className="space-y-4">
          <div className="rounded-md border">
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 font-medium text-sm">
              <span>Item</span>
              <span>Amount</span>
            </div>
            {[
              { key: 'finalApprovedAmount', label: 'Final Approved Amount' },
              { key: 'deductionAmount', label: 'Deduction Amount' },
              { key: 'discountAmount', label: 'Discount' },
              { key: 'waivedOffAmount', label: 'Waived Off Amount' },
              { key: 'settlementPart', label: 'Settlement Part' },
              { key: 'tdsAmount', label: 'TDS' },
              { key: 'otherDeduction', label: 'Other Deduction' },
              { key: 'netSettlementAmount', label: 'Net Settlement Amount' },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-2 p-3 border-t">
                <Label htmlFor={key} className="text-sm flex items-center">{label}</Label>
                <Input
                  id={key}
                  type="number"
                  step="0.01"
                  value={(formData[key as keyof typeof formData] as string) || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormData(prev => {
                      const next = { ...prev, [key]: val }
                      if (key !== 'netSettlementAmount') {
                        const approved = parseFloat(next.finalApprovedAmount as string) || 0
                        const ded =
                          (parseFloat(next.deductionAmount as string) || 0) +
                          (parseFloat(next.discountAmount as string) || 0) +
                          (parseFloat(next.waivedOffAmount as string) || 0) +
                          (parseFloat(next.settlementPart as string) || 0) +
                          (parseFloat(next.tdsAmount as string) || 0) +
                          (parseFloat(next.otherDeduction as string) || 0)
                        next.netSettlementAmount = (approved - ded).toFixed(2)
                      }
                      return next
                    })
                  }}
                  className={key === 'netSettlementAmount' ? 'font-semibold' : ''}
                />
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks as string}
              onChange={(e) => updateField('remarks', e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="mt-1"
            />
          </div>
        </div>
      ),
    },
  ]

  // Only mount MultiStepForm after formData is populated from lead so Hospital Name & Case Status pre-fill
  if (!formReady && !initialData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading patient details…
        </CardContent>
      </Card>
    )
  }

  return (
    <MultiStepForm
      key={`discharge-${leadId}-${formReady}`}
      steps={steps}
      onSubmit={handleSubmit}
      initialFormData={formData}
    />
  )
}
