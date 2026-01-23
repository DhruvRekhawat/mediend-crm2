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
import { Upload } from 'lucide-react'

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
}

export function DischargeSheetForm({ leadId, onSuccess, initialData }: DischargeSheetFormProps) {
  const { data: lead } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const { uploadFile, uploading: isUploading } = useFileUpload({ folder: 'discharge' })
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([])

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

  // Update form data when lead or initialData becomes available (only once)
  useEffect(() => {
    if (!lead && !initialData) return
    if (initializedRef.current) return
    
    // Use setTimeout to defer state update and avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setFormData((prev) => {
        // Check if already initialized (has data from lead or initialData)
        if (prev.patientName || prev.month) {
          initializedRef.current = true
          return prev
        }
        
        let updated = { ...prev }
        
        if (lead) {
          updated = {
            ...updated,
            patientName: lead.patientName || '',
            patientPhone: lead.phoneNumber || '',
            doctorName: lead.surgeonName || '',
            hospitalName: lead.hospitalName || '',
            category: lead.category || '',
            treatment: lead.treatment || '',
            circle: lead.circle || '',
            leadSource: lead.source || '',
            billAmount: lead.billAmount?.toString() || '',
            implantCost: lead.implantAmount?.toString() || '',
            surgeryDate: lead.surgeryDate ? new Date(lead.surgeryDate).toISOString().split('T')[0] : '',
          }
        }
        
        if (initialData) {
          updated = {
            ...updated,
            ...initialData,
            month: initialData.month ? new Date(initialData.month).toISOString().split('T')[0] : '',
            dischargeDate: initialData.dischargeDate ? new Date(initialData.dischargeDate).toISOString().split('T')[0] : '',
            surgeryDate: initialData.surgeryDate ? new Date(initialData.surgeryDate).toISOString().split('T')[0] : '',
          }
        }
        
        initializedRef.current = true
        return updated
      })
    }, 0)
    
    return () => clearTimeout(timeoutId)
  }, [lead, initialData])

  const handleSubmit = async () => {
    try {
      // Use formData from component state (steps update this directly)
      const finalData = formData
      
      const payload: any = {
        leadId,
        month: finalData.month ? new Date(finalData.month as string) : null,
        dischargeDate: finalData.dischargeDate ? new Date(finalData.dischargeDate as string) : null,
        surgeryDate: finalData.surgeryDate ? new Date(finalData.surgeryDate as string) : null,
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
        totalAmount: parseFloat(finalData.totalAmount as string) || 0,
        billAmount: parseFloat(finalData.billAmount as string) || 0,
        cashPaidByPatient: parseFloat(finalData.cashPaidByPatient as string) || 0,
        cashOrDedPaid: parseFloat(finalData.cashOrDedPaid as string) || 0,
        referralAmount: parseFloat(finalData.referralAmount as string) || 0,
        cabCharges: parseFloat(finalData.cabCharges as string) || 0,
        implantCost: parseFloat(finalData.implantCost as string) || 0,
        dcCharges: parseFloat(finalData.dcCharges as string) || 0,
        doctorCharges: parseFloat(finalData.doctorCharges as string) || 0,
        hospitalSharePct: finalData.hospitalSharePct ? parseFloat(finalData.hospitalSharePct as string) : null,
        hospitalShareAmount: parseFloat(finalData.hospitalShareAmount as string) || 0,
        mediendSharePct: finalData.mediendSharePct ? parseFloat(finalData.mediendSharePct as string) : null,
        mediendShareAmount: parseFloat(finalData.mediendShareAmount as string) || 0,
        mediendNetProfit: parseFloat(finalData.mediendNetProfit as string) || 0,
        remarks: finalData.remarks || '',
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

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadFile(file)
      if (!result) return
      const url = result.url
      setUploadedFiles(prev => [...prev, { name: file.name, url }])
      toast.success('File uploaded successfully')
    } catch {
      toast.error('Failed to upload file')
    }
  }

  // Revenue split calculations are now handled in updateField function

  const steps = [
    {
      id: 'dates',
      title: 'Dates & Basic Info',
      description: 'Enter discharge dates and basic information',
      component: ({ formData: stepData, updateFormData }: { formData: Record<string, unknown>, updateFormData: (data: Partial<Record<string, unknown>>) => void }) => {
        // Merge component's formData with stepData
        const currentData = { ...formData, ...stepData }
        const updateBoth = (data: Partial<Record<string, unknown>>) => {
          updateFormData(data)
          setFormData(prev => ({ ...prev, ...data }))
        }
        return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="hospitalName">Hospital</Label>
              <Input
                id="hospitalName"
                value={(currentData.hospitalName as string) || ''}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={(currentData.status as string) || ''}
                onChange={(e) => updateBoth({ status: e.target.value })}
                placeholder="Case status"
              />
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Input
                id="paymentType"
                value={(currentData.paymentType as string) || ''}
                onChange={(e) => updateBoth({ paymentType: e.target.value })}
                placeholder="Payment mode"
              />
            </div>
            <div>
              <Label htmlFor="approvedOrCash">Approved / Cash</Label>
              <Input
                id="approvedOrCash"
                value={(currentData.approvedOrCash as string) || ''}
                onChange={(e) => updateBoth({ approvedOrCash: e.target.value })}
              />
            </div>
          </div>
        </div>
        )
      },
      validate: () => {
        const dischargeDate = (formData.dischargeDate as string) || ''
        return dischargeDate.length > 0
      },
    },
    {
      id: 'financials',
      title: 'Financial Details',
      description: 'Enter bill amounts and payments',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billAmount">Hospital Bill Amount *</Label>
              <Input
                id="billAmount"
                type="number"
                step="0.01"
                value={formData.billAmount as string}
                onChange={(e) => updateField('billAmount', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                value={formData.totalAmount as string}
                onChange={(e) => updateField('totalAmount', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cashPaidByPatient">Cash Paid by Patient</Label>
              <Input
                id="cashPaidByPatient"
                type="number"
                step="0.01"
                value={formData.cashPaidByPatient as string}
                onChange={(e) => updateField('cashPaidByPatient', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cashOrDedPaid">Settled Amount</Label>
              <Input
                id="cashOrDedPaid"
                type="number"
                step="0.01"
                value={formData.cashOrDedPaid}
                onChange={(e) => updateField('cashOrDedPaid', e.target.value)}
                placeholder="Cash / Deduction paid"
              />
            </div>
          </div>
        </div>
      ),
      validate: () => (formData.billAmount as string)?.length > 0,
    },
    {
      id: 'breakdown',
      title: 'Cost Breakdown',
      description: 'Enter cost breakdown details',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="referralAmount">Referral Amount</Label>
              <Input
                id="referralAmount"
                type="number"
                step="0.01"
                value={formData.referralAmount as string}
                onChange={(e) => updateField('referralAmount', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cabCharges">CAB Charges</Label>
              <Input
                id="cabCharges"
                type="number"
                step="0.01"
                value={formData.cabCharges as string}
                onChange={(e) => updateField('cabCharges', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="implantCost">Implant Cost</Label>
              <Input
                id="implantCost"
                type="number"
                step="0.01"
                value={formData.implantCost as string}
                onChange={(e) => updateField('implantCost', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dcCharges">D&C Charges</Label>
              <Input
                id="dcCharges"
                type="number"
                step="0.01"
                value={formData.dcCharges as string}
                onChange={(e) => updateField('dcCharges', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="doctorCharges">Doctor Charges</Label>
              <Input
                id="doctorCharges"
                type="number"
                step="0.01"
                value={formData.doctorCharges}
                onChange={(e) => updateField('doctorCharges', e.target.value)}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'revenue',
      title: 'Revenue Split',
      description: 'Calculate revenue split between hospital and Mediend',
      component: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hospitalSharePct">Hospital Share %</Label>
              <Input
                id="hospitalSharePct"
                type="number"
                step="0.01"
                value={formData.hospitalSharePct as string}
                onChange={(e) => updateField('hospitalSharePct', e.target.value)}
                placeholder="Percentage"
              />
            </div>
            <div>
              <Label htmlFor="hospitalShareAmount">Hospital Share Amount</Label>
              <Input
                id="hospitalShareAmount"
                type="number"
                step="0.01"
                value={formData.hospitalShareAmount as string}
                onChange={(e) => updateField('hospitalShareAmount', e.target.value)}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="mediendSharePct">Mediend Share %</Label>
              <Input
                id="mediendSharePct"
                type="number"
                step="0.01"
                value={formData.mediendSharePct as string}
                onChange={(e) => updateField('mediendSharePct', e.target.value)}
                placeholder="Percentage"
              />
            </div>
            <div>
              <Label htmlFor="mediendShareAmount">Mediend Share Amount</Label>
              <Input
                id="mediendShareAmount"
                type="number"
                step="0.01"
                value={formData.mediendShareAmount as string}
                onChange={(e) => updateField('mediendShareAmount', e.target.value)}
                readOnly
              />
            </div>
            <div>
              <Label htmlFor="mediendNetProfit">Net Profit</Label>
              <Input
                id="mediendNetProfit"
                type="number"
                step="0.01"
                value={formData.mediendNetProfit as string}
                onChange={(e) => updateField('mediendNetProfit', e.target.value)}
                readOnly
                className="font-semibold"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks as string}
              onChange={(e) => updateField('remarks', e.target.value)}
              rows={3}
              placeholder="Any additional notes"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'bills',
      title: 'Upload Bills',
      description: 'Upload hospital bills and settlement documents',
      component: (
        <div className="space-y-4">
          <div>
            <Label>Upload Documents</Label>
            <div className="mt-2">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files</Label>
              <div className="space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <MultiStepForm
      steps={steps}
      onSubmit={handleSubmit}
      initialFormData={formData}
    />
  )
}
