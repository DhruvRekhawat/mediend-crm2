'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MultiStepForm } from '@/components/forms/multi-step-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFileUpload } from '@/hooks/use-file-upload'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'

interface RoomTypeOption {
  name: string
  rent: string
}

export interface HospitalSuggestionItem {
  id: string
  hospitalName: string
  tentativeBill?: number | null
  roomRentGeneral?: number | null
  roomRentPrivate?: number | null
  roomRentICU?: number | null
  notes?: string | null
}

interface PreAuthRaiseFormProps {
  leadId: string
  initialData?: {
    requestedHospitalName?: string
    requestedRoomType?: string
    diseaseDescription?: string
    diseaseImages?: Array<{ name: string; url: string }>
    hospitalSuggestions?: string[]
    roomTypes?: RoomTypeOption[]
    suggestedHospitals?: HospitalSuggestionItem[]
  }
  onSuccess?: () => void
  onCancel?: () => void
}

interface FilePreview {
  name: string
  url: string
}

export function PreAuthRaiseForm({
  leadId,
  initialData,
  onSuccess,
  onCancel,
}: PreAuthRaiseFormProps) {
  const router = useRouter()
  const { uploadFile, uploading: isUploading } = useFileUpload({ folder: 'preauth' })
  const suggestedHospitals = initialData?.suggestedHospitals ?? []
  const legacyHospitals = initialData?.hospitalSuggestions ?? []
  const legacyRoomTypes = initialData?.roomTypes ?? []
  const hasSuggestedCards = suggestedHospitals.length > 0

  const [formData, setFormData] = useState({
    requestedHospitalName: initialData?.requestedHospitalName || '',
    requestedRoomType: initialData?.requestedRoomType || '',
    diseaseDescription: initialData?.diseaseDescription || '',
    diseaseImages: (initialData?.diseaseImages || []) as FilePreview[],
    expectedAdmissionDate: '',
    expectedSurgeryDate: '',
    isNewHospitalRequest: false,
    newHospitalName: '',
  })

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadFile(file)
      if (!result) return
      const url = result.url
      setFormData((prev) => ({
        ...prev,
        diseaseImages: [...prev.diseaseImages, { name: file.name, url }],
      }))
      toast.success('File uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload file')
      console.error('File upload error:', error)
    }
  }

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      diseaseImages: prev.diseaseImages.filter((_, i) => i !== index),
    }))
  }

  const hospitalNameForSubmit = formData.isNewHospitalRequest
    ? formData.newHospitalName.trim()
    : formData.requestedHospitalName

  const handleSubmit = async () => {
    if (!hospitalNameForSubmit) {
      toast.error('Hospital name is required')
      return
    }
    if (!formData.isNewHospitalRequest && !formData.requestedRoomType?.trim()) {
      toast.error('Room type is required')
      return
    }
    if (!formData.diseaseDescription.trim()) {
      toast.error('Disease description is required')
      return
    }
    try {
      const response = await fetch(`/api/leads/${leadId}/raise-preauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedHospitalName: hospitalNameForSubmit,
          requestedRoomType: formData.requestedRoomType || undefined,
          diseaseDescription: formData.diseaseDescription,
          diseaseImages: formData.diseaseImages,
          expectedAdmissionDate: formData.expectedAdmissionDate,
          expectedSurgeryDate: formData.expectedSurgeryDate,
          isNewHospitalRequest: formData.isNewHospitalRequest,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to raise pre-auth')
      }

      toast.success('Pre-auth raised successfully')
      onSuccess?.()
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to raise pre-auth'
      )
    }
  }

  const selectedHospitalCard = hasSuggestedCards && formData.requestedHospitalName && !formData.isNewHospitalRequest
    ? suggestedHospitals.find((h) => h.hospitalName === formData.requestedHospitalName)
    : null

  const roomOptionsFromCard = selectedHospitalCard
    ? [
        ...(selectedHospitalCard.roomRentGeneral != null ? [{ name: 'General', rent: String(selectedHospitalCard.roomRentGeneral) }] : []),
        ...(selectedHospitalCard.roomRentPrivate != null ? [{ name: 'Private', rent: String(selectedHospitalCard.roomRentPrivate) }] : []),
        ...(selectedHospitalCard.roomRentICU != null ? [{ name: 'ICU', rent: String(selectedHospitalCard.roomRentICU) }] : []),
      ]
    : []

  const steps = [
    {
      id: 'hospital',
      title: 'Hospital & Room Selection',
      description: 'Select from Insurance’s suggested hospitals and room types',
      component: (
        <div className="space-y-4">
          {hasSuggestedCards ? (
            <>
              <div className="space-y-2">
                <Label>Hospital *</Label>
                <div className="grid gap-2">
                  {suggestedHospitals.map((h) => (
                    <div
                      key={h.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isNewHospitalRequest: false,
                          requestedHospitalName: h.hospitalName,
                          requestedRoomType: '',
                          newHospitalName: '',
                        }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && setFormData((prev) => ({ ...prev, isNewHospitalRequest: false, requestedHospitalName: h.hospitalName, requestedRoomType: '', newHospitalName: '' }))}
                      className={`rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
                        formData.requestedHospitalName === h.hospitalName && !formData.isNewHospitalRequest
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">{h.hospitalName}</div>
                      {(h.tentativeBill != null || h.roomRentGeneral != null || h.roomRentPrivate != null || h.roomRentICU != null) && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {h.tentativeBill != null && <span>Tentative bill: ₹{h.tentativeBill}</span>}
                          {(h.roomRentGeneral != null || h.roomRentPrivate != null || h.roomRentICU != null) && (
                            <span className="ml-2">
                              Room: {[h.roomRentGeneral != null && `General ₹${h.roomRentGeneral}`, h.roomRentPrivate != null && `Private ₹${h.roomRentPrivate}`, h.roomRentICU != null && `ICU ₹${h.roomRentICU}`].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                      {h.notes && <div className="mt-1 text-sm text-muted-foreground">{h.notes}</div>}
                    </div>
                  ))}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        isNewHospitalRequest: true,
                        requestedHospitalName: '',
                        requestedRoomType: '',
                        newHospitalName: prev.newHospitalName || '',
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && setFormData((prev) => ({ ...prev, isNewHospitalRequest: true, requestedHospitalName: '', requestedRoomType: '', newHospitalName: prev.newHospitalName || '' }))}
                    className={`rounded-lg border-2 border-dashed p-4 text-left transition-colors cursor-pointer ${
                      formData.isNewHospitalRequest ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/30' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <span className="font-medium">Request New Hospital</span>
                    <p className="text-sm text-muted-foreground mt-1">Enter a hospital name not in the list</p>
                  </div>
                </div>
              </div>
              {formData.isNewHospitalRequest ? (
                <div>
                  <Label htmlFor="newHospitalName">New Hospital Name *</Label>
                  <Input
                    id="newHospitalName"
                    value={formData.newHospitalName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, newHospitalName: e.target.value }))}
                    placeholder="Enter hospital name"
                  />
                </div>
              ) : selectedHospitalCard && (roomOptionsFromCard.length > 0 ? (
                <div>
                  <Label htmlFor="roomType">Room Type *</Label>
                  <Select
                    value={formData.requestedRoomType}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, requestedRoomType: v }))}
                  >
                    <SelectTrigger id="roomType">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomOptionsFromCard.map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {r.name}
                          {r.rent ? ` – ₹${r.rent}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="roomType">Room Type *</Label>
                  <Input
                    id="roomType"
                    value={formData.requestedRoomType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, requestedRoomType: e.target.value }))}
                    placeholder="e.g. General, Private, ICU"
                  />
                </div>
              ))}
            </>
          ) : legacyHospitals.length > 0 ? (
            <div>
              <Label htmlFor="hospital">Hospital *</Label>
              <Select
                value={formData.requestedHospitalName}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, requestedHospitalName: v }))
                }
              >
                <SelectTrigger id="hospital">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {legacyHospitals.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="hospital">Hospital Name *</Label>
              <Input
                id="hospital"
                value={formData.requestedHospitalName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    requestedHospitalName: e.target.value,
                  }))
                }
                placeholder="Enter hospital name"
                required
              />
            </div>
          )}

          {!hasSuggestedCards && (legacyRoomTypes.length > 0 ? (
            <div>
              <Label htmlFor="roomType">Room Type *</Label>
              <Select
                value={formData.requestedRoomType}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, requestedRoomType: v }))
                }
              >
                <SelectTrigger id="roomType">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {legacyRoomTypes.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                      {r.rent ? ` – ₹${r.rent}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : !hasSuggestedCards ? (
            <div>
              <Label htmlFor="roomType">Room Type *</Label>
              <Input
                id="roomType"
                value={formData.requestedRoomType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    requestedRoomType: e.target.value,
                  }))
                }
                placeholder="e.g. General Ward, Single AC"
                required
              />
            </div>
          ) : null)}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admissionDate">Expected Admission Date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={formData.expectedAdmissionDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expectedAdmissionDate: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="surgeryDate">Expected Surgery Date</Label>
              <Input
                id="surgeryDate"
                type="date"
                value={formData.expectedSurgeryDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expectedSurgeryDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
      ),
      validate: () =>
        (formData.isNewHospitalRequest ? formData.newHospitalName.trim().length > 0 : formData.requestedHospitalName.length > 0) &&
        (formData.isNewHospitalRequest || roomOptionsFromCard.length === 0 || formData.requestedRoomType.length > 0),
    },
    {
      id: 'disease',
      title: 'Disease Details & Documents',
      description: 'Describe the disease and upload any related images',
      component: (
        <div className="space-y-6">
          <div>
            <Label htmlFor="diseaseDescription">Disease Description *</Label>
            <Textarea
              id="diseaseDescription"
              value={formData.diseaseDescription}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  diseaseDescription: e.target.value,
                }))
              }
              placeholder="Describe the disease, symptoms, and treatment required"
              rows={5}
              required
              className="mt-2"
            />
          </div>
          <div>
            <Label>Disease Images (optional)</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
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
                onClick={() =>
                  document.getElementById('file-upload')?.click()
                }
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          </div>
          {formData.diseaseImages.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Images</Label>
              <div className="grid grid-cols-2 gap-2">
                {formData.diseaseImages.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      validate: () => formData.diseaseDescription.trim().length > 0,
    },
    {
      id: 'review',
      title: 'Review & Submit',
      description: 'Review all information before submitting',
      component: (
        <div className="space-y-4">
          <div>
            <Label>Hospital</Label>
            <p className="text-sm">{hospitalNameForSubmit || formData.requestedHospitalName || formData.newHospitalName}</p>
            {formData.isNewHospitalRequest && <p className="text-xs text-muted-foreground">(New hospital request)</p>}
          </div>
          <div>
            <Label>Room Type</Label>
            <p className="text-sm">{formData.requestedRoomType || '—'}</p>
          </div>
          {formData.expectedAdmissionDate && (
            <div>
              <Label>Expected Admission Date</Label>
              <p className="text-sm">{formData.expectedAdmissionDate}</p>
            </div>
          )}
          {formData.expectedSurgeryDate && (
            <div>
              <Label>Expected Surgery Date</Label>
              <p className="text-sm">{formData.expectedSurgeryDate}</p>
            </div>
          )}
          <div>
            <Label>Disease Description</Label>
            <p className="text-sm whitespace-pre-wrap">
              {formData.diseaseDescription}
            </p>
          </div>
          {formData.diseaseImages.length > 0 && (
            <div>
              <Label>Uploaded Images ({formData.diseaseImages.length})</Label>
              <p className="text-sm text-muted-foreground">
                {formData.diseaseImages.map((f) => f.name).join(', ')}
              </p>
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
      onCancel={onCancel}
    />
  )
}
