'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

interface HospitalRow {
  hospitalName: string
  tentativeBill: string
  roomRentGeneral: string
  roomRentSingle: string
  roomRentDeluxe: string
  roomRentSemiPrivate: string
  notes: string
}

interface HospitalSuggestionFormProps {
  kypSubmissionId: string
  initialSumInsured?: string
  initialBalanceInsured?: string
  initialCopayPercentage?: string
  initialCapping?: number | null
  initialInsuranceName?: string
  initialTpa?: string
  initialHospitals?: Array<{
    hospitalName: string
    tentativeBill?: number | null
    roomRentGeneral?: number | null
    roomRentSingle?: number | null
    roomRentDeluxe?: number | null
    roomRentSemiPrivate?: number | null
    notes?: string | null
  }>
  onSuccess?: () => void
  onCancel?: () => void
}

const emptyHospital = (): HospitalRow => ({
  hospitalName: '',
  tentativeBill: '',
  roomRentGeneral: '',
  roomRentSingle: '',
  roomRentDeluxe: '',
  roomRentSemiPrivate: '',
  notes: '',
})

export function HospitalSuggestionForm({
  kypSubmissionId,
  initialSumInsured = '',
  initialBalanceInsured = '',
  initialCopayPercentage = '',
  initialCapping,
  initialInsuranceName = '',
  initialTpa = '',
  initialHospitals,
  onSuccess,
  onCancel,
}: HospitalSuggestionFormProps) {
  const [sumInsured, setSumInsured] = useState(initialSumInsured)
  const [balanceInsured, setBalanceInsured] = useState(initialBalanceInsured)
  const [copayPercentage, setCopayPercentage] = useState(initialCopayPercentage)
  const [capping, setCapping] = useState(initialCapping ? String(initialCapping) : '')
  const [insuranceName, setInsuranceName] = useState(initialInsuranceName)
  const [tpa, setTpa] = useState(initialTpa)
  const [hospitals, setHospitals] = useState<HospitalRow[]>(() => {
    if (initialHospitals?.length) {
      return initialHospitals.map((h) => ({
        hospitalName: h.hospitalName ?? '',
        tentativeBill: h.tentativeBill != null ? String(h.tentativeBill) : '',
        roomRentGeneral: h.roomRentGeneral != null ? String(h.roomRentGeneral) : '',
        roomRentSingle: h.roomRentSingle != null ? String(h.roomRentSingle) : '',
        roomRentDeluxe: h.roomRentDeluxe != null ? String(h.roomRentDeluxe) : '',
        roomRentSemiPrivate: h.roomRentSemiPrivate != null ? String(h.roomRentSemiPrivate) : '',
        notes: h.notes ?? '',
      }))
    }
    return [emptyHospital()]
  })

  const addHospital = () => setHospitals((prev) => [...prev, emptyHospital()])
  const removeHospital = (index: number) =>
    setHospitals((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  const updateHospital = (index: number, field: keyof HospitalRow, value: string) =>
    setHospitals((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    )

  const hospitalColors = [
    'bg-blue-100/80 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
    'bg-emerald-100/80 border-emerald-300 dark:bg-emerald-900/40 dark:border-emerald-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
    'bg-purple-100/80 border-purple-300 dark:bg-purple-900/40 dark:border-purple-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
    'bg-amber-100/80 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
    'bg-rose-100/80 border-rose-300 dark:bg-rose-900/40 dark:border-rose-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
    'bg-indigo-100/80 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-700 [&_input]:bg-white dark:[&_input]:bg-gray-950',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sumInsured.trim()) {
      toast.error('Sum insured is required')
      return
    }
    if (!balanceInsured.trim()) {
      toast.error('Balance insured is required')
      return
    }
    if (!copayPercentage.trim()) {
      toast.error('Copay is required')
      return
    }
    const list = hospitals
      .map((h) => ({
        hospitalName: h.hospitalName.trim(),
        tentativeBill: h.tentativeBill ? parseFloat(h.tentativeBill) : undefined,
        roomRentGeneral: h.roomRentGeneral ? parseFloat(h.roomRentGeneral) : undefined,
        roomRentSingle: h.roomRentSingle ? parseFloat(h.roomRentSingle) : undefined,
        roomRentDeluxe: h.roomRentDeluxe ? parseFloat(h.roomRentDeluxe) : undefined,
        roomRentSemiPrivate: h.roomRentSemiPrivate ? parseFloat(h.roomRentSemiPrivate) : undefined,
        notes: h.notes.trim() || undefined,
      }))
      .filter((h) => h.hospitalName)
    if (!list.length) {
      toast.error('At least one hospital with a name is required')
      return
    }

    try {
      await apiPost('/api/kyp/pre-auth', {
        kypSubmissionId,
        sumInsured: sumInsured.trim(),
        balanceInsured: balanceInsured.trim(),
        copay: copayPercentage.trim(),
        capping: capping ? parseFloat(capping) : undefined,
        insuranceName: insuranceName.trim() || undefined,
        tpa: tpa.trim() || undefined,
        hospitals: list,
      })
      toast.success('Hospital suggestions saved. BD can now raise pre-auth.')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="sumInsured">Sum Insured *</Label>
          <Input
            id="sumInsured"
            value={sumInsured}
            onChange={(e) => setSumInsured(e.target.value)}
            placeholder="e.g. 500000"
            required
          />
        </div>
        <div>
          <Label htmlFor="balanceInsured">Balance Insured *</Label>
          <Input
            id="balanceInsured"
            value={balanceInsured}
            onChange={(e) => setBalanceInsured(e.target.value)}
            placeholder="e.g. 300000"
            required
          />
        </div>
        <div>
          <Label htmlFor="copayPercentage">Copay % *</Label>
          <Input
            id="copayPercentage"
            value={copayPercentage}
            onChange={(e) => setCopayPercentage(e.target.value)}
            placeholder="e.g. 10"
            required
          />
        </div>
        <div>
          <Label htmlFor="capping">Capping</Label>
          <Input
            id="capping"
            type="number"
            value={capping}
            onChange={(e) => setCapping(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="insuranceName">Insurance Name</Label>
          <Input
            id="insuranceName"
            value={insuranceName}
            onChange={(e) => setInsuranceName(e.target.value)}
            placeholder="Enter insurance name"
          />
        </div>
        <div>
          <Label htmlFor="tpa">TPA</Label>
          <Input
            id="tpa"
            value={tpa}
            onChange={(e) => setTpa(e.target.value)}
            placeholder="e.g. TPA Name"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Suggested Hospitals</Label>
          <Button type="button" variant="outline" size="sm" onClick={addHospital}>
            <Plus className="h-4 w-4 mr-1" /> Add hospital
          </Button>
        </div>
        <div className="space-y-4">
          {hospitals.map((h, index) => (
            <div 
              key={index} 
              className={cn(
                "rounded-lg border p-4 space-y-3 transition-colors",
                hospitalColors[index % hospitalColors.length]
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hospital {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeHospital(index)}
                  disabled={hospitals.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Hospital Name *</Label>
                  <Input
                    value={h.hospitalName}
                    onChange={(e) => updateHospital(index, 'hospitalName', e.target.value)}
                    placeholder="Hospital name"
                    required
                  />
                </div>
                <div>
                  <Label>Tentative Bill (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.tentativeBill}
                    onChange={(e) => updateHospital(index, 'tentativeBill', e.target.value)}
                    placeholder="e.g. 100000"
                  />
                </div>
                <div>
                  <Label>Room Rent – General (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentGeneral}
                    onChange={(e) => updateHospital(index, 'roomRentGeneral', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Room Rent – Single (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentSingle}
                    onChange={(e) => updateHospital(index, 'roomRentSingle', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Room Rent – Deluxe (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentDeluxe}
                    onChange={(e) => updateHospital(index, 'roomRentDeluxe', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Room Rent – Semi-Private (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentSemiPrivate}
                    onChange={(e) => updateHospital(index, 'roomRentSemiPrivate', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={h.notes}
                    onChange={(e) => updateHospital(index, 'notes', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">Save hospital suggestions</Button>
      </div>
    </form>
  )
}
