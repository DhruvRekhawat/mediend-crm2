'use client'

import { useState } from 'react'
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
  roomRentPrivate: string
  roomRentICU: string
  notes: string
}

interface HospitalSuggestionFormProps {
  kypSubmissionId: string
  initialSumInsured?: string
  initialHospitals?: Array<{
    hospitalName: string
    tentativeBill?: number | null
    roomRentGeneral?: number | null
    roomRentPrivate?: number | null
    roomRentICU?: number | null
    notes?: string | null
  }>
  onSuccess?: () => void
  onCancel?: () => void
}

const emptyHospital = (): HospitalRow => ({
  hospitalName: '',
  tentativeBill: '',
  roomRentGeneral: '',
  roomRentPrivate: '',
  roomRentICU: '',
  notes: '',
})

export function HospitalSuggestionForm({
  kypSubmissionId,
  initialSumInsured = '',
  initialHospitals,
  onSuccess,
  onCancel,
}: HospitalSuggestionFormProps) {
  const [sumInsured, setSumInsured] = useState(initialSumInsured)
  const [hospitals, setHospitals] = useState<HospitalRow[]>(() => {
    if (initialHospitals?.length) {
      return initialHospitals.map((h) => ({
        hospitalName: h.hospitalName ?? '',
        tentativeBill: h.tentativeBill != null ? String(h.tentativeBill) : '',
        roomRentGeneral: h.roomRentGeneral != null ? String(h.roomRentGeneral) : '',
        roomRentPrivate: h.roomRentPrivate != null ? String(h.roomRentPrivate) : '',
        roomRentICU: h.roomRentICU != null ? String(h.roomRentICU) : '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sumInsured.trim()) {
      toast.error('Sum insured is required')
      return
    }
    const list = hospitals
      .map((h) => ({
        hospitalName: h.hospitalName.trim(),
        tentativeBill: h.tentativeBill ? parseFloat(h.tentativeBill) : undefined,
        roomRentGeneral: h.roomRentGeneral ? parseFloat(h.roomRentGeneral) : undefined,
        roomRentPrivate: h.roomRentPrivate ? parseFloat(h.roomRentPrivate) : undefined,
        roomRentICU: h.roomRentICU ? parseFloat(h.roomRentICU) : undefined,
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
        <div className="flex items-center justify-between mb-2">
          <Label>Suggested Hospitals</Label>
          <Button type="button" variant="outline" size="sm" onClick={addHospital}>
            <Plus className="h-4 w-4 mr-1" /> Add hospital
          </Button>
        </div>
        <div className="space-y-4">
          {hospitals.map((h, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
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
                  <Label>Room Rent – Private (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentPrivate}
                    onChange={(e) => updateHospital(index, 'roomRentPrivate', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Room Rent – ICU (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={h.roomRentICU}
                    onChange={(e) => updateHospital(index, 'roomRentICU', e.target.value)}
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
