'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface IPDDetailsFormProps {
  leadId: string
  patientName?: string
  age?: number
  sex?: string
  insuranceName?: string
  insuranceType?: string
  sumInsured?: string
  copay?: string
  capping?: number
  roomType?: string
  roomRent?: string
  treatment?: string
  hospitalName?: string
  bdName?: string
  bdManagerName?: string
  onSuccess?: (admissionId?: string) => void
  onCancel?: () => void
}

export function IPDDetailsForm({
  leadId,
  patientName = '',
  age,
  sex = '',
  insuranceName = '',
  insuranceType = '',
  sumInsured = '',
  copay = '',
  capping,
  roomType = '',
  roomRent = '',
  treatment = '',
  hospitalName = '',
  bdName = '',
  bdManagerName = '',
  onSuccess,
  onCancel,
}: IPDDetailsFormProps) {
  const [formData, setFormData] = useState({
    admissionDate: '',
    admissionTime: '',
    hospitalAddress: '',
    googleMapLocation: '',
    surgeryDate: '',
    surgeryTime: '',
    tpa: '',
    instrument: '',
    implantConsumables: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPdfDownload, setShowPdfDownload] = useState(false)
  const [admissionId, setAdmissionId] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.admissionDate) newErrors.admissionDate = 'Admission date is required'
    if (!formData.admissionTime.trim()) newErrors.admissionTime = 'Admission time is required'
    if (!formData.hospitalAddress.trim()) newErrors.hospitalAddress = 'Hospital address is required'
    if (!formData.surgeryDate) newErrors.surgeryDate = 'Surgery date is required'
    if (!formData.surgeryTime.trim()) newErrors.surgeryTime = 'Surgery time is required'
    if (!formData.tpa.trim()) newErrors.tpa = 'TPA is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the errors')
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      const response = await apiPost<{ id: string }>(`/api/leads/${leadId}/initiate`, {
        admissionDate: formData.admissionDate,
        admissionTime: formData.admissionTime.trim(),
        admittingHospital: hospitalName,
        hospitalAddress: formData.hospitalAddress.trim(),
        googleMapLocation: formData.googleMapLocation.trim() || undefined,
        surgeryDate: formData.surgeryDate,
        surgeryTime: formData.surgeryTime.trim(),
        tpa: formData.tpa.trim(),
        instrument: formData.instrument.trim() || undefined,
        implantConsumables: formData.implantConsumables.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      })
      toast.success('IPD details saved successfully')
      setAdmissionId(response?.id || leadId)
      setShowPdfDownload(true)
      onSuccess?.(response?.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save IPD details')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePdfDownload = (includeLogo: boolean) => {
    // This would call a PDF generation API with the option
    // For now, just showing the concept
    toast.success(`PDF will be downloaded ${includeLogo ? 'with' : 'without'} MediEND logo`)
    setShowPdfDownload(false)
    onSuccess?.(admissionId)
  }

  return (
    <>
      {showPdfDownload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Download IPD Form PDF</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Would you like to include or exclude the MediEND logo?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handlePdfDownload(true)}
                className="flex-1"
              >
                With Logo
              </Button>
              <Button
                onClick={() => handlePdfDownload(false)}
                className="flex-1"
              >
                Without Logo
              </Button>
            </div>
          </div>
        </div>
      )}
    
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Auto-filled Patient Info Section */}
      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Patient & Policy Information (Auto-filled)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Patient Name</p>
            <p className="font-medium">{patientName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Age</p>
            <p className="font-medium">{age || '-'}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Gender</p>
            <p className="font-medium">{sex || '-'}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Insurance</p>
            <p className="font-medium">{insuranceName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Sum Insured</p>
            <p className="font-medium">{sumInsured}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Copay</p>
            <p className="font-medium">{copay}%</p>
          </div>
          {capping && (
            <div>
              <p className="text-gray-600 dark:text-gray-400">Capping</p>
              <p className="font-medium">₹{capping}</p>
            </div>
          )}
          <div>
            <p className="text-gray-600 dark:text-gray-400">Room Type</p>
            <p className="font-medium">{roomType}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Room Rent</p>
            <p className="font-medium">₹{roomRent}</p>
          </div>
        </div>
      </div>

      {/* Admission Details Section */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Admission Details *</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="admissionDate">Admission Date *</Label>
            <Input
              id="admissionDate"
              type="date"
              value={formData.admissionDate}
              onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
              required
            />
            {errors.admissionDate && <p className="text-xs text-destructive mt-1">{errors.admissionDate}</p>}
          </div>
          <div>
            <Label htmlFor="admissionTime">Admission Time *</Label>
            <Input
              id="admissionTime"
              type="time"
              value={formData.admissionTime}
              onChange={(e) => setFormData({ ...formData, admissionTime: e.target.value })}
              required
            />
            {errors.admissionTime && <p className="text-xs text-destructive mt-1">{errors.admissionTime}</p>}
          </div>
          <div>
            <Label htmlFor="hospitalAddress">Hospital Address *</Label>
            <Input
              id="hospitalAddress"
              value={formData.hospitalAddress}
              onChange={(e) => setFormData({ ...formData, hospitalAddress: e.target.value })}
              placeholder="Enter full hospital address"
              required
            />
            {errors.hospitalAddress && <p className="text-xs text-destructive mt-1">{errors.hospitalAddress}</p>}
          </div>
          <div>
            <Label htmlFor="googleMapLocation">Google Map Location</Label>
            <Input
              id="googleMapLocation"
              value={formData.googleMapLocation}
              onChange={(e) => setFormData({ ...formData, googleMapLocation: e.target.value })}
              placeholder="Paste Google Maps link (optional)"
            />
          </div>
        </div>
      </div>

      {/* Surgery Details Section */}
      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Surgery Details *</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="surgeryDate">Surgery Date *</Label>
            <Input
              id="surgeryDate"
              type="date"
              value={formData.surgeryDate}
              onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
              required
            />
            {errors.surgeryDate && <p className="text-xs text-destructive mt-1">{errors.surgeryDate}</p>}
          </div>
          <div>
            <Label htmlFor="surgeryTime">Surgery Time *</Label>
            <Input
              id="surgeryTime"
              type="time"
              value={formData.surgeryTime}
              onChange={(e) => setFormData({ ...formData, surgeryTime: e.target.value })}
              required
            />
            {errors.surgeryTime && <p className="text-xs text-destructive mt-1">{errors.surgeryTime}</p>}
          </div>
          <div>
            <Label htmlFor="tpa">TPA *</Label>
            <Input
              id="tpa"
              value={formData.tpa}
              onChange={(e) => setFormData({ ...formData, tpa: e.target.value })}
              placeholder="TPA name"
              required
            />
            {errors.tpa && <p className="text-xs text-destructive mt-1">{errors.tpa}</p>}
          </div>
        </div>
      </div>

      {/* Optional Medical Details */}
      <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Medical Details (Optional)</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="instrument">Instruments/Equipment</Label>
            <Textarea
              id="instrument"
              value={formData.instrument}
              onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
              placeholder="List any special instruments required"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="implantConsumables">Implants/Consumables</Label>
            <Textarea
              id="implantConsumables"
              value={formData.implantConsumables}
              onChange={(e) => setFormData({ ...formData, implantConsumables: e.target.value })}
              placeholder="List implants and consumables needed"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save IPD Details'}
        </Button>
      </div>
    </form>
    </>
  )
}
