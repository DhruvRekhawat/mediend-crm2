'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFileUpload } from '@/hooks/use-file-upload'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { File, Plus, X } from 'lucide-react'

interface PreAuthRaiseFormProps {
  leadId: string
  preAuthId?: string
  initialHospitals?: string[]
  initialRequestedHospital?: string
  initialRequestedRoomType?: string
  initialDisease?: string
  initialAadhar?: string
  initialPan?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function PreAuthRaiseForm({
  leadId,
  preAuthId,
  initialHospitals = [],
  initialRequestedHospital = '',
  initialRequestedRoomType = '',
  initialDisease = '',
  initialAadhar = '',
  initialPan = '',
  onSuccess,
  onCancel,
}: PreAuthRaiseFormProps) {
  const { uploadFile, uploading } = useFileUpload()
  const [formData, setFormData] = useState({
    requestedHospital: initialRequestedHospital,
    requestNewHospital: false,
    requestedRoomType: initialRequestedRoomType,
    diseaseDescription: initialDisease,
    aadhar: initialAadhar,
    pan: initialPan,
    expectedAdmissionDate: '',
    expectedSurgeryDate: '',
  })
  
  const [files, setFiles] = useState<{
    aadharFile: { name: string; url: string } | null
    panFile: { name: string; url: string } | null
    prescriptionFile: { name: string; url: string } | null
    investigationFiles: { name: string; url: string }[]
  }>({
    aadharFile: null,
    panFile: null,
    prescriptionFile: null,
    investigationFiles: [],
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleFileUpload = async (field: string, file: File) => {
    const result = await uploadFile(file)
    if (result) {
      if (field === 'investigation') {
        setFiles(prev => ({
          ...prev,
          investigationFiles: [...prev.investigationFiles, { name: file.name, url: result.url }]
        }))
      } else {
        setFiles(prev => ({
          ...prev,
          [field]: { name: file.name, url: result.url }
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.requestedHospital.trim() && !formData.requestNewHospital) {
      newErrors.hospital = 'Please select a hospital or request a new one'
    }
    if (!formData.requestedRoomType.trim()) {
      newErrors.roomType = 'Room type is required'
    }
    if (!formData.diseaseDescription.trim()) {
      newErrors.disease = 'Disease description is required'
    }
    if (!formData.expectedAdmissionDate) {
      newErrors.admissionDate = 'Expected admission date is required'
    }
    if (!formData.expectedSurgeryDate) {
      newErrors.surgeryDate = 'Expected surgery date is required'
    }
    if (!files.aadharFile) {
      newErrors.aadhar = 'Aadhar card upload is required'
    }
    if (!files.panFile) {
      newErrors.pan = 'PAN card upload is required'
    }
    if (!files.prescriptionFile) {
      newErrors.prescription = 'Prescription upload is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the errors in the form')
      return
    }

    setErrors({})
    try {
      await apiPost(`/api/leads/${leadId}/raise-preauth`, {
        requestedHospitalName: formData.requestedHospital.trim(),
        requestedRoomType: formData.requestedRoomType.trim(),
        diseaseDescription: formData.diseaseDescription.trim(),
        aadhar: formData.aadhar.trim() || undefined,
        pan: formData.pan.trim() || undefined,
        aadharFileUrl: files.aadharFile?.url,
        panFileUrl: files.panFile?.url,
        prescriptionFileUrl: files.prescriptionFile?.url,
        investigationFileUrls: files.investigationFiles,
        expectedAdmissionDate: new Date(formData.expectedAdmissionDate).toISOString(),
        expectedSurgeryDate: new Date(formData.expectedSurgeryDate).toISOString(),
        isNewHospitalRequest: formData.requestNewHospital,
      })
      toast.success('Pre-auth raised successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to raise pre-auth')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Step 1: Hospital & Room Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hospital">Hospital *</Label>
            <select
              id="hospital"
              value={formData.requestedHospital}
              onChange={(e) => setFormData({ ...formData, requestedHospital: e.target.value, requestNewHospital: false })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
              required={!formData.requestNewHospital}
            >
              <option value="">Select from suggestions</option>
              {initialHospitals.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            {errors.hospital && <p className="text-xs text-destructive mt-1">{errors.hospital}</p>}
          </div>
          <div>
            <Label htmlFor="roomType">Room Type *</Label>
            <select
              id="roomType"
              value={formData.requestedRoomType}
              onChange={(e) => setFormData({ ...formData, requestedRoomType: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
              required
            >
              <option value="">Select room type</option>
              <option value="GENERAL">General</option>
              <option value="SINGLE">Single</option>
              <option value="DELUXE">Deluxe</option>
              <option value="SEMI_PRIVATE">Semi-Private</option>
            </select>
            {errors.roomType && <p className="text-xs text-destructive mt-1">{errors.roomType}</p>}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="newHospital"
            checked={formData.requestNewHospital}
            onChange={(e) => setFormData({ ...formData, requestNewHospital: e.target.checked, requestedHospital: '' })}
            className="h-4 w-4"
          />
          <Label htmlFor="newHospital" className="cursor-pointer">Request a hospital not in suggestions</Label>
        </div>
        {formData.requestNewHospital && (
          <div className="mt-3">
            <Label htmlFor="newHospitalName">Hospital Name *</Label>
            <Input
              id="newHospitalName"
              value={formData.requestedHospital}
              onChange={(e) => setFormData({ ...formData, requestedHospital: e.target.value })}
              placeholder="Enter hospital name"
              required
            />
          </div>
        )}
      </div>

      <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Step 2: Dates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="admissionDate">Expected Admission Date *</Label>
            <Input
              id="admissionDate"
              type="date"
              value={formData.expectedAdmissionDate}
              onChange={(e) => setFormData({ ...formData, expectedAdmissionDate: e.target.value })}
              required
            />
            {errors.admissionDate && <p className="text-xs text-destructive mt-1">{errors.admissionDate}</p>}
          </div>
          <div>
            <Label htmlFor="surgeryDate">Expected Surgery Date *</Label>
            <Input
              id="surgeryDate"
              type="date"
              value={formData.expectedSurgeryDate}
              onChange={(e) => setFormData({ ...formData, expectedSurgeryDate: e.target.value })}
              required
            />
            {errors.surgeryDate && <p className="text-xs text-destructive mt-1">{errors.surgeryDate}</p>}
          </div>
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Step 3: Disease & Medical Details</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="disease">Disease Description *</Label>
            <Textarea
              id="disease"
              value={formData.diseaseDescription}
              onChange={(e) => setFormData({ ...formData, diseaseDescription: e.target.value })}
              placeholder="Describe the disease and treatment plan"
              required
              rows={3}
            />
            {errors.disease && <p className="text-xs text-destructive mt-1">{errors.disease}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="aadhar">Aadhar Number</Label>
              <Input
                id="aadhar"
                value={formData.aadhar}
                onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="pan">PAN Number</Label>
              <Input
                id="pan"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Step 4: Document Uploads</h3>
        <div className="space-y-4">
          <div>
            <Label>Aadhar Card *</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload('aadharFile', file)
                }}
                disabled={uploading}
              />
              {errors.aadhar && <p className="text-xs text-destructive mt-1">{errors.aadhar}</p>}
              {files.aadharFile && (
                <div className="mt-2 flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md">
                  <File className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{files.aadharFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => ({ ...prev, aadharFile: null }))}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>PAN Card *</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload('panFile', file)
                }}
                disabled={uploading}
              />
              {errors.pan && <p className="text-xs text-destructive mt-1">{errors.pan}</p>}
              {files.panFile && (
                <div className="mt-2 flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md">
                  <File className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{files.panFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => ({ ...prev, panFile: null }))}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Prescription *</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload('prescriptionFile', file)
                }}
                disabled={uploading}
              />
              {errors.prescription && <p className="text-xs text-destructive mt-1">{errors.prescription}</p>}
              {files.prescriptionFile && (
                <div className="mt-2 flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md">
                  <File className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">{files.prescriptionFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => ({ ...prev, prescriptionFile: null }))}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Investigation Files (Optional)</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={(e) => {
                  const fileList = e.target.files
                  if (fileList) {
                    for (let i = 0; i < fileList.length; i++) {
                      handleFileUpload('investigation', fileList[i])
                    }
                  }
                }}
                disabled={uploading}
              />
              {files.investigationFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {files.investigationFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-md">
                      <File className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles(prev => ({
                          ...prev,
                          investigationFiles: prev.investigationFiles.filter((_, i) => i !== idx)
                        }))}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Raise Pre-Auth'}
        </Button>
      </div>
    </form>
  )
}
