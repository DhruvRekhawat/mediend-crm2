'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { User, Phone, MapPin, Stethoscope, Building2, Shield, Calendar, Package, Car, ChevronDown, ChevronUp } from 'lucide-react'

export interface IPDDetailsFormProps {
  leadId: string
  // Patient Information
  patientName?: string
  leadRef?: string
  age?: number
  sex?: string
  phoneNumber?: string
  alternateNumber?: string
  attendantName?: string
  attendantContactNo?: string
  circle?: string
  city?: string
  // Treatment & Procedure
  category?: string
  treatment?: string
  quantityGrade?: string
  anesthesia?: string
  // Surgeon
  surgeonName?: string
  surgeonType?: string
  // Hospital
  hospitalName?: string
  // Insurance & Billing (from KYP/PreAuth)
  insuranceName?: string
  insuranceType?: string
  tpa?: string
  sumInsured?: string | number
  copay?: string | number
  capping?: string | number
  roomType?: string
  roomRent?: string | number
  // BD info
  bdName?: string
  bdManagerName?: string
  onSuccess?: (admissionId?: string) => void
  onCancel?: () => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  color: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

function Section({ title, icon, color, children, collapsible = false, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardHeader
        className={`pb-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">{icon}{title}</span>
          {collapsible && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
        </CardTitle>
      </CardHeader>
      {(!collapsible || open) && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value || '—'}</p>
    </div>
  )
}

export function IPDDetailsForm({
  leadId,
  patientName = '',
  leadRef = '',
  age,
  sex = '',
  phoneNumber = '',
  alternateNumber = '',
  attendantName = '',
  attendantContactNo = '',
  circle = '',
  city = '',
  category = '',
  treatment = '',
  quantityGrade = '',
  anesthesia = '',
  surgeonName = '',
  surgeonType = '',
  hospitalName = '',
  insuranceName = '',
  insuranceType = '',
  tpa: tpaProp = '',
  sumInsured,
  copay,
  capping,
  roomType = '',
  roomRent,
  bdName = '',
  bdManagerName = '',
  onSuccess,
  onCancel,
}: IPDDetailsFormProps) {
  const [formData, setFormData] = useState({
    admissionDate: '',
    admissionTime: '',
    surgeryDate: '',
    surgeryTime: '',
    hospitalAddress: '',
    googleMapLocation: '',
    tpa: tpaProp,
    instrument: '',
    implantConsumables: '',
    notes: '',
    // Cab - Admission
    cabAdmissionPickupLocation: '',
    cabAdmissionPickupDateTime: '',
    cabAdmissionFrom: '',
    cabAdmissionTo: '',
    // Cab - Discharge
    cabDischargePickupLocation: '',
    cabDischargePickupDateTime: '',
    cabDischargeFrom: '',
    cabDischargeTo: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (key: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.admissionDate) e.admissionDate = 'Required'
    if (!formData.admissionTime.trim()) e.admissionTime = 'Required'
    if (!formData.surgeryDate) e.surgeryDate = 'Required'
    if (!formData.surgeryTime.trim()) e.surgeryTime = 'Required'
    if (!formData.hospitalAddress.trim()) e.hospitalAddress = 'Required'
    if (!formData.tpa.trim()) e.tpa = 'Required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Please fill all required fields')
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
        cabAdmissionPickupLocation: formData.cabAdmissionPickupLocation.trim() || undefined,
        cabAdmissionPickupDateTime: formData.cabAdmissionPickupDateTime || undefined,
        cabAdmissionFrom: formData.cabAdmissionFrom.trim() || undefined,
        cabAdmissionTo: formData.cabAdmissionTo.trim() || undefined,
        cabDischargePickupLocation: formData.cabDischargePickupLocation.trim() || undefined,
        cabDischargePickupDateTime: formData.cabDischargePickupDateTime || undefined,
        cabDischargeFrom: formData.cabDischargeFrom.trim() || undefined,
        cabDischargeTo: formData.cabDischargeTo.trim() || undefined,
      })
      toast.success('IPD details saved successfully')
      onSuccess?.(response?.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save IPD details')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (v?: string | number | null) => (v != null && v !== '' ? String(v) : undefined)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Section 1: Patient Information */}
      <Section
        title="1. Patient Information"
        icon={<User className="h-4 w-4 text-blue-600" />}
        color="border-blue-500"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            <ReadOnlyField label="Patient Name" value={patientName} />
            <ReadOnlyField label="Patient ID / Ref" value={leadRef} />
            <ReadOnlyField label="Age" value={fmt(age)} />
            <ReadOnlyField label="Gender" value={sex} />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ReadOnlyField label="Primary Contact" value={phoneNumber} />
              <ReadOnlyField label="Alternate Contact" value={alternateNumber} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attendant Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ReadOnlyField label="Attendant Name" value={attendantName} />
              <ReadOnlyField label="Attendant Contact" value={attendantContactNo} />
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ReadOnlyField label="Circle" value={circle} />
              <ReadOnlyField label="City" value={city} />
            </div>
          </div>
        </div>
      </Section>

      {/* Section 2: Treatment & Procedure */}
      <Section
        title="2. Treatment & Procedure Details"
        icon={<Stethoscope className="h-4 w-4 text-purple-600" />}
        color="border-purple-500"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          <ReadOnlyField label="Category" value={category} />
          <ReadOnlyField label="Treatment Name" value={treatment} />
          <ReadOnlyField label="Quantity / Grade" value={quantityGrade} />
          <ReadOnlyField label="Type of Anaesthesia" value={anesthesia} />
        </div>
      </Section>

      {/* Section 3: Surgeon Details */}
      <Section
        title="3. Surgeon Details"
        icon={<User className="h-4 w-4 text-teal-600" />}
        color="border-teal-500"
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ReadOnlyField label="Surgeon Name" value={surgeonName} />
          <ReadOnlyField label="Surgeon Type" value={surgeonType} />
        </div>
      </Section>

      {/* Section 4: Hospital / Clinic Details */}
      <Section
        title="4. Hospital / Clinic Details"
        icon={<Building2 className="h-4 w-4 text-orange-600" />}
        color="border-orange-500"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ReadOnlyField label="Hospital / Clinic Name" value={hospitalName} />
            <ReadOnlyField label="Location (City)" value={city} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hospitalAddress">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hospitalAddress"
                value={formData.hospitalAddress}
                onChange={(e) => set('hospitalAddress', e.target.value)}
                placeholder="Full hospital address"
                className={errors.hospitalAddress ? 'border-destructive' : ''}
              />
              {errors.hospitalAddress && <p className="text-xs text-destructive mt-1">{errors.hospitalAddress}</p>}
            </div>
            <div>
              <Label htmlFor="googleMapLocation">Google Map Link</Label>
              <Input
                id="googleMapLocation"
                value={formData.googleMapLocation}
                onChange={(e) => set('googleMapLocation', e.target.value)}
                placeholder="Paste Google Maps link (optional)"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Section 5: Insurance & Billing */}
      <Section
        title="5. Insurance & Billing Details"
        icon={<Shield className="h-4 w-4 text-green-600" />}
        color="border-green-500"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            <ReadOnlyField label="Insurance Type" value={insuranceType} />
            <ReadOnlyField label="Insurance Company" value={insuranceName} />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Financial Details</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
              <ReadOnlyField label="Co-pay %" value={copay != null ? `${copay}%` : undefined} />
              <ReadOnlyField label="Sum Insured" value={sumInsured != null ? `₹${Number(sumInsured).toLocaleString('en-IN')}` : undefined} />
              <ReadOnlyField label="Room Rent Limit" value={roomRent != null ? `₹${Number(roomRent).toLocaleString('en-IN')}` : undefined} />
              <ReadOnlyField label="Room Type" value={roomType} />
              <ReadOnlyField label="Capping" value={capping != null && capping !== '' ? `₹${Number(capping).toLocaleString('en-IN')}` : 'No'} />
            </div>
          </div>
          <div className="border-t pt-3">
            <div>
              <Label htmlFor="tpa">
                TPA Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpa"
                value={formData.tpa}
                onChange={(e) => set('tpa', e.target.value)}
                placeholder="Third Party Administrator name"
                className={`mt-1 ${errors.tpa ? 'border-destructive' : ''}`}
              />
              {errors.tpa && <p className="text-xs text-destructive mt-1">{errors.tpa}</p>}
            </div>
          </div>
        </div>
      </Section>

      {/* Section 6: Admission & Surgery Timeline */}
      <Section
        title="6. Admission & Surgery Timeline"
        icon={<Calendar className="h-4 w-4 text-red-600" />}
        color="border-red-500"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admission</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admissionDate">
                  Arrival Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => set('admissionDate', e.target.value)}
                  className={`mt-1 ${errors.admissionDate ? 'border-destructive' : ''}`}
                />
                {errors.admissionDate && <p className="text-xs text-destructive mt-1">{errors.admissionDate}</p>}
              </div>
              <div>
                <Label htmlFor="admissionTime">
                  Arrival Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="admissionTime"
                  type="time"
                  value={formData.admissionTime}
                  onChange={(e) => set('admissionTime', e.target.value)}
                  className={`mt-1 ${errors.admissionTime ? 'border-destructive' : ''}`}
                />
                {errors.admissionTime && <p className="text-xs text-destructive mt-1">{errors.admissionTime}</p>}
              </div>
            </div>
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Surgery</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="surgeryDate">
                  Surgery Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="surgeryDate"
                  type="date"
                  value={formData.surgeryDate}
                  onChange={(e) => set('surgeryDate', e.target.value)}
                  className={`mt-1 ${errors.surgeryDate ? 'border-destructive' : ''}`}
                />
                {errors.surgeryDate && <p className="text-xs text-destructive mt-1">{errors.surgeryDate}</p>}
              </div>
              <div>
                <Label htmlFor="surgeryTime">
                  Surgery Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="surgeryTime"
                  type="time"
                  value={formData.surgeryTime}
                  onChange={(e) => set('surgeryTime', e.target.value)}
                  className={`mt-1 ${errors.surgeryTime ? 'border-destructive' : ''}`}
                />
                {errors.surgeryTime && <p className="text-xs text-destructive mt-1">{errors.surgeryTime}</p>}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 7: Implants & Consumables */}
      <Section
        title="7. Implants & Consumables"
        icon={<Package className="h-4 w-4 text-indigo-600" />}
        color="border-indigo-500"
        collapsible
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="implantConsumables">Implants Used / Consumables</Label>
            <Textarea
              id="implantConsumables"
              value={formData.implantConsumables}
              onChange={(e) => set('implantConsumables', e.target.value)}
              placeholder="List implants and consumables used..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
          <div>
            <Label htmlFor="instrument">Instruments Required</Label>
            <Textarea
              id="instrument"
              value={formData.instrument}
              onChange={(e) => set('instrument', e.target.value)}
              placeholder="List special instruments required..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
        </div>
      </Section>

      {/* Section 8: Cab Service */}
      <Section
        title="8. Cab Service (Optional)"
        icon={<Car className="h-4 w-4 text-yellow-600" />}
        color="border-yellow-500"
        collapsible
        defaultOpen={false}
      >
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Admission Pickup</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cabAdmissionPickupLocation">Pickup Location</Label>
                <Input
                  id="cabAdmissionPickupLocation"
                  value={formData.cabAdmissionPickupLocation}
                  onChange={(e) => set('cabAdmissionPickupLocation', e.target.value)}
                  placeholder="Pickup address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabAdmissionPickupDateTime">Pickup Date & Time</Label>
                <Input
                  id="cabAdmissionPickupDateTime"
                  type="datetime-local"
                  value={formData.cabAdmissionPickupDateTime}
                  onChange={(e) => set('cabAdmissionPickupDateTime', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabAdmissionFrom">From</Label>
                <Input
                  id="cabAdmissionFrom"
                  value={formData.cabAdmissionFrom}
                  onChange={(e) => set('cabAdmissionFrom', e.target.value)}
                  placeholder="Pickup origin"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabAdmissionTo">To</Label>
                <Input
                  id="cabAdmissionTo"
                  value={formData.cabAdmissionTo}
                  onChange={(e) => set('cabAdmissionTo', e.target.value)}
                  placeholder="Drop destination (hospital)"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Discharge Pickup</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cabDischargePickupLocation">Pickup Location</Label>
                <Input
                  id="cabDischargePickupLocation"
                  value={formData.cabDischargePickupLocation}
                  onChange={(e) => set('cabDischargePickupLocation', e.target.value)}
                  placeholder="Hospital address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabDischargePickupDateTime">Pickup Date & Time</Label>
                <Input
                  id="cabDischargePickupDateTime"
                  type="datetime-local"
                  value={formData.cabDischargePickupDateTime}
                  onChange={(e) => set('cabDischargePickupDateTime', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabDischargeFrom">From</Label>
                <Input
                  id="cabDischargeFrom"
                  value={formData.cabDischargeFrom}
                  onChange={(e) => set('cabDischargeFrom', e.target.value)}
                  placeholder="Hospital (origin)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cabDischargeTo">To</Label>
                <Input
                  id="cabDischargeTo"
                  value={formData.cabDischargeTo}
                  onChange={(e) => set('cabDischargeTo', e.target.value)}
                  placeholder="Home address (destination)"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Document & BD Info */}
      <Card className="border-l-4 border-gray-400">
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ReadOnlyField label="Name of BD" value={bdName} />
            <ReadOnlyField label="BD Manager" value={bdManagerName} />
          </div>
          <div className="border-t pt-3">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional information..."
              rows={2}
              className="mt-1 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save IPD Details & Mark Admitted'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Fields marked <span className="text-destructive font-bold">*</span> are required
        </p>
      </div>
    </form>
  )
}
