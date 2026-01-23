'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MultiStepForm } from '@/components/forms/multi-step-form'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'

export interface RoomTypeRow {
  name: string
  rent: string
}

interface PreAuthFormProps {
  kypSubmissionId: string
  initialData?: {
    sumInsured?: string | null
    roomRent?: string | null
    capping?: string | null
    copay?: string | null
    icu?: string | null
    hospitalNameSuggestion?: string | null
    hospitalSuggestions?: string[] | null
    roomTypes?: RoomTypeRow[] | null
    insurance?: string | null
    tpa?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
  isReadOnly?: boolean
}

const defaultRoomTypes: RoomTypeRow[] = [{ name: '', rent: '' }]

export function PreAuthForm({
  kypSubmissionId,
  initialData,
  onSuccess,
  onCancel,
  isReadOnly = false,
}: PreAuthFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<{
    sumInsured: string
    roomRent: string
    capping: string
    copay: string
    icu: string
    hospitalNameSuggestion: string
    hospitalSuggestions: string[]
    roomTypes: RoomTypeRow[]
    insurance: string
    tpa: string
    notes: string
  }>({
    sumInsured: initialData?.sumInsured || '',
    roomRent: initialData?.roomRent || '',
    capping: initialData?.capping || '',
    copay: initialData?.copay || '',
    icu: initialData?.icu || '',
    hospitalNameSuggestion: initialData?.hospitalNameSuggestion || '',
    hospitalSuggestions: Array.isArray(initialData?.hospitalSuggestions)
      ? initialData.hospitalSuggestions.length
        ? initialData.hospitalSuggestions
        : ['']
      : initialData?.hospitalNameSuggestion
        ? [initialData.hospitalNameSuggestion]
        : [''],
    roomTypes:
      Array.isArray(initialData?.roomTypes) && initialData.roomTypes.length > 0
        ? initialData.roomTypes.map((r) => ({ name: r.name || '', rent: r.rent || '' }))
        : defaultRoomTypes,
    insurance: initialData?.insurance || '',
    tpa: initialData?.tpa || '',
    notes: '',
  })

  // Note: Form state is initialized from initialData in useState above.
  // If initialData changes and form needs to reset, parent should use a key prop to remount component.

  const updateBoth = (
    updater: (prev: typeof formData) => Partial<typeof formData>,
    updateFormData: (d: Partial<Record<string, unknown>>) => void
  ) => {
    setFormData((prev) => {
      const next = { ...prev, ...updater(prev) }
      updateFormData(next)
      return next
    })
  }

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const hospitals = (data.hospitalSuggestions as string[])?.filter(Boolean) ?? []
      const rooms = ((data.roomTypes as RoomTypeRow[]) ?? []).filter((r) => r.name.trim())
      await apiPost('/api/kyp/pre-auth', {
        kypSubmissionId,
        sumInsured: data.sumInsured,
        roomRent: data.roomRent,
        capping: data.capping,
        copay: data.copay,
        icu: data.icu,
        hospitalNameSuggestion: data.hospitalNameSuggestion,
        hospitalSuggestions: hospitals,
        roomTypes: rooms,
        insurance: data.insurance,
        tpa: data.tpa,
      })

      toast.success('KYP details saved successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit')
      throw error
    }
  }

  if (isReadOnly) {
    const hospitals = formData.hospitalSuggestions.filter(Boolean)
    const rooms = formData.roomTypes.filter((r) => r.name.trim())
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pre-Authorization Details</CardTitle>
          <CardDescription>View-only mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sum Insured</Label>
              <p className="text-sm">{formData.sumInsured || '-'}</p>
            </div>
            <div>
              <Label>Room Rent</Label>
              <p className="text-sm">{formData.roomRent || '-'}</p>
            </div>
            <div>
              <Label>Capping</Label>
              <p className="text-sm">{formData.capping || '-'}</p>
            </div>
            <div>
              <Label>Copay</Label>
              <p className="text-sm">{formData.copay || '-'}</p>
            </div>
            <div>
              <Label>ICU</Label>
              <p className="text-sm">{formData.icu || '-'}</p>
            </div>
            <div>
              <Label>Insurance</Label>
              <p className="text-sm">{formData.insurance || '-'}</p>
            </div>
            <div>
              <Label>TPA</Label>
              <p className="text-sm">{formData.tpa || '-'}</p>
            </div>
          </div>
          {hospitals.length > 0 && (
            <div>
              <Label>Suggested Hospitals</Label>
              <ul className="list-disc list-inside text-sm mt-1">
                {hospitals.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {rooms.length > 0 && (
            <div>
              <Label>Room Types</Label>
              <ul className="text-sm mt-1 space-y-1">
                {rooms.map((r, i) => (
                  <li key={i}>
                    {r.name} {r.rent ? `– ₹${r.rent}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onCancel && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onCancel}>
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const steps = [
    {
      id: 'policy',
      title: 'Policy Details',
      description: 'Enter insurance policy information',
      component: ({
        formData: fd,
        updateFormData,
      }: {
        formData: Record<string, unknown>
        updateFormData: (d: Partial<Record<string, unknown>>) => void
      }) => (
        <div className="space-y-4">
          <div>
            <Label htmlFor="sumInsured">Sum Insured *</Label>
            <Input
              id="sumInsured"
              value={(fd.sumInsured as string) ?? ''}
              onChange={(e) =>
                updateBoth(() => ({ sumInsured: e.target.value }), updateFormData)
              }
              placeholder="Enter sum insured"
            />
          </div>
          <div>
            <Label htmlFor="insurance">Insurance Company</Label>
            <Input
              id="insurance"
              value={(fd.insurance as string) ?? ''}
              onChange={(e) =>
                updateBoth(() => ({ insurance: e.target.value }), updateFormData)
              }
              placeholder="Insurance company name"
            />
          </div>
          <div>
            <Label htmlFor="tpa">TPA</Label>
            <Input
              id="tpa"
              value={(fd.tpa as string) ?? ''}
              onChange={(e) =>
                updateBoth(() => ({ tpa: e.target.value }), updateFormData)
              }
              placeholder="TPA name"
            />
          </div>
        </div>
      ),
      validate: () => formData.sumInsured.length > 0,
    },
    {
      id: 'coverage',
      title: 'Coverage Limits',
      description: 'Enter coverage limits and restrictions',
      component: ({
        formData: fd,
        updateFormData,
      }: {
        formData: Record<string, unknown>
        updateFormData: (d: Partial<Record<string, unknown>>) => void
      }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="roomRent">Room Rent (default)</Label>
              <Input
                id="roomRent"
                value={(fd.roomRent as string) ?? ''}
                onChange={(e) =>
                  updateBoth(() => ({ roomRent: e.target.value }), updateFormData)
                }
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <Label htmlFor="icu">ICU Limit</Label>
              <Input
                id="icu"
                value={(fd.icu as string) ?? ''}
                onChange={(e) =>
                  updateBoth(() => ({ icu: e.target.value }), updateFormData)
                }
                placeholder="e.g. 10000"
              />
            </div>
            <div>
              <Label htmlFor="capping">Capping</Label>
              <Input
                id="capping"
                value={(fd.capping as string) ?? ''}
                onChange={(e) =>
                  updateBoth(() => ({ capping: e.target.value }), updateFormData)
                }
                placeholder="Capping amount"
              />
            </div>
            <div>
              <Label htmlFor="copay">Copay %</Label>
              <Input
                id="copay"
                value={(fd.copay as string) ?? ''}
                onChange={(e) =>
                  updateBoth(() => ({ copay: e.target.value }), updateFormData)
                }
                placeholder="e.g. 20"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'hospitals',
      title: 'Hospital & Room Recommendations',
      description: 'Add multiple hospitals and room types for BD to choose from',
      component: ({
        formData: fd,
        updateFormData,
      }: {
        formData: Record<string, unknown>
        updateFormData: (d: Partial<Record<string, unknown>>) => void
      }) => {
        const hospitals = (fd.hospitalSuggestions as string[]) ?? []
        const rooms = (fd.roomTypes as RoomTypeRow[]) ?? []

        return (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Suggested Hospitals</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [...hospitals, '']
                    updateBoth(() => ({ hospitalSuggestions: next }), updateFormData)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {hospitals.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h}
                      onChange={(e) => {
                        const next = [...hospitals]
                        next[i] = e.target.value
                        updateBoth(
                          () => ({ hospitalSuggestions: next }),
                          updateFormData
                        )
                      }}
                      placeholder="Hospital name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = hospitals.filter((_, j) => j !== i)
                        updateBoth(
                          () => ({ hospitalSuggestions: next }),
                          updateFormData
                        )
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {hospitals.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add at least one hospital for BD to select from.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Room Types (name + rent limit)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = [...rooms, { name: '', rent: '' }]
                    updateBoth(() => ({ roomTypes: next }), updateFormData)
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {rooms.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={r.name}
                      onChange={(e) => {
                        const next = rooms.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x
                        )
                        updateBoth(() => ({ roomTypes: next }), updateFormData)
                      }}
                      placeholder="Room type (e.g. General Ward)"
                    />
                    <Input
                      value={r.rent}
                      onChange={(e) => {
                        const next = rooms.map((x, j) =>
                          j === i ? { ...x, rent: e.target.value } : x
                        )
                        updateBoth(() => ({ roomTypes: next }), updateFormData)
                      }}
                      placeholder="Rent limit"
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = rooms.filter((_, j) => j !== i)
                        updateBoth(() => ({ roomTypes: next }), updateFormData)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add at least one room type for BD to select from.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes for BD</Label>
              <Textarea
                id="notes"
                value={(fd.notes as string) ?? ''}
                onChange={(e) =>
                  updateBoth(() => ({ notes: e.target.value }), updateFormData)
                }
                placeholder="Additional notes or instructions"
                rows={3}
              />
            </div>
          </div>
        )
      },
      validate: () => {
        const h = formData.hospitalSuggestions.filter(Boolean)
        const r = formData.roomTypes.filter((x) => x.name.trim())
        return h.length >= 1 && r.length >= 1
      },
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review all information before submitting',
      component: ({ formData: fd }: { formData: Record<string, unknown> }) => {
        const hospitals = ((fd.hospitalSuggestions as string[]) ?? []).filter(Boolean)
        const rooms = ((fd.roomTypes as RoomTypeRow[]) ?? []).filter((r) =>
          r.name.trim()
        )
        return (
          <div className="space-y-4">
            <div>
              <Label>Sum Insured</Label>
              <p className="text-sm">{(fd.sumInsured as string) || '-'}</p>
            </div>
            <div>
              <Label>Insurance / TPA</Label>
              <p className="text-sm">
                {(fd.insurance as string) || '-'} / {(fd.tpa as string) || '-'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room Rent</Label>
                <p className="text-sm">{(fd.roomRent as string) || '-'}</p>
              </div>
              <div>
                <Label>ICU</Label>
                <p className="text-sm">{(fd.icu as string) || '-'}</p>
              </div>
              <div>
                <Label>Capping</Label>
                <p className="text-sm">{(fd.capping as string) || '-'}</p>
              </div>
              <div>
                <Label>Copay</Label>
                <p className="text-sm">{(fd.copay as string) || '-'}</p>
              </div>
            </div>
            {hospitals.length > 0 && (
              <div>
                <Label>Suggested Hospitals</Label>
                <ul className="list-disc list-inside text-sm">
                  {hospitals.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {rooms.length > 0 && (
              <div>
                <Label>Room Types</Label>
                <ul className="text-sm space-y-1">
                  {rooms.map((r, i) => (
                    <li key={i}>
                      {r.name} {r.rent ? `– ₹${r.rent}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(fd.notes as string) && (
              <div>
                <Label>Notes</Label>
                <p className="text-sm whitespace-pre-wrap">{fd.notes as string}</p>
              </div>
            )}
          </div>
        )
      },
    },
  ]

  const initialFormData: Record<string, unknown> = {
    ...formData,
    hospitalSuggestions: formData.hospitalSuggestions,
    roomTypes: formData.roomTypes,
  }

  return (
    <MultiStepForm
      steps={steps}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      initialFormData={initialFormData}
    />
  )
}
