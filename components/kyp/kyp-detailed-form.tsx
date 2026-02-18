'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useFileUpload } from '@/hooks/use-file-upload'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { File, X } from 'lucide-react'
import { validateAadhaar, validatePAN } from '@/lib/validations'

interface KYPDetailedFormProps {
  leadId: string
  initialDisease?: string
  initialAadhar?: string
  initialPan?: string
  initialAadharFileUrl?: string
  initialPanFileUrl?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface FileWithUrl {
  name: string
  url: string
}

export function KYPDetailedForm({
  leadId,
  initialDisease = '',
  initialAadhar = '',
  initialPan = '',
  initialAadharFileUrl = '',
  initialPanFileUrl = '',
  onSuccess,
  onCancel,
}: KYPDetailedFormProps) {
  const [formData, setFormData] = useState({
    disease: initialDisease,
    patientConsent: false,
    aadhar: initialAadhar,
    pan: initialPan,
  })
  const [aadharFileUrl, setAadharFileUrl] = useState(initialAadharFileUrl)
  const [panFileUrl, setPanFileUrl] = useState(initialPanFileUrl)
  const [prescriptionFileUrl, setPrescriptionFileUrl] = useState('')
  const [diseasePhotos, setDiseasePhotos] = useState<FileWithUrl[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { uploadFile, uploading } = useFileUpload({ folder: 'kyp' })

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'aadhar' | 'pan' | 'prescription' | 'diseasePhoto'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file)
    if (result) {
      if (type === 'aadhar') setAadharFileUrl(result.url)
      else if (type === 'pan') setPanFileUrl(result.url)
      else if (type === 'prescription') setPrescriptionFileUrl(result.url)
      else if (type === 'diseasePhoto') {
        setDiseasePhotos((prev) => [...prev, { name: file.name, url: result.url }])
      }
    }
  }

  const removeDiseasePhoto = (index: number) => {
    setDiseasePhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.disease.trim()) {
      newErrors.disease = 'Disease/Diagnosis is required'
    }

    if (formData.aadhar && !validateAadhaar(formData.aadhar)) {
      newErrors.aadhar = 'Invalid Aadhaar (12 digits starting with 2-9)'
    }

    if (formData.pan && !validatePAN(formData.pan)) {
      newErrors.pan = 'Invalid PAN format'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the errors in the form')
      return
    }

    setErrors({})
    try {
      await apiPost('/api/kyp/submit', {
        leadId,
        type: 'detailed',
        disease: formData.disease.trim(),
        patientConsent: formData.patientConsent,
        aadhar: formData.aadhar.trim() || undefined,
        pan: formData.pan.trim() || undefined,
        aadharFileUrl: aadharFileUrl || undefined,
        panFileUrl: panFileUrl || undefined,
        prescriptionFileUrl: prescriptionFileUrl || undefined,
        diseasePhotos: diseasePhotos.length > 0 ? diseasePhotos : undefined,
      })
      toast.success('KYP (Detailed) submitted. You can now raise pre-auth.')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit KYP (Detailed)')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="disease">Disease / Diagnosis *</Label>
        <Textarea
          id="disease"
          value={formData.disease}
          onChange={(e) => setFormData({ ...formData, disease: e.target.value })}
          placeholder="Enter disease or diagnosis"
          required
          rows={3}
        />
        {errors.disease && <p className="text-xs text-destructive mt-1">{errors.disease}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="patientConsent"
          checked={formData.patientConsent}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, patientConsent: checked === true })
          }
        />
        <Label htmlFor="patientConsent" className="font-normal cursor-pointer">
          Patient consent obtained (optional)
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="aadhar">Aadhar (optional)</Label>
          <Input
            id="aadhar"
            value={formData.aadhar}
            onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
            placeholder="Aadhar number"
          />
          {errors.aadhar && <p className="text-xs text-destructive mt-1">{errors.aadhar}</p>}
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'aadhar')}
            />
            {aadharFileUrl && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>Aadhaar card uploaded</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="pan">PAN (optional)</Label>
          <Input
            id="pan"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
            placeholder="PAN number"
          />
          {errors.pan && <p className="text-xs text-destructive mt-1">{errors.pan}</p>}
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'pan')}
            />
            {panFileUrl && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>PAN card uploaded</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <Label>Prescription (optional)</Label>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileChange(e, 'prescription')}
          className="mt-2"
        />
        {prescriptionFileUrl && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <File className="h-4 w-4" />
            <span>Prescription uploaded</span>
          </div>
        )}
      </div>

      <div>
        <Label>Disease photos (optional)</Label>
        <Input
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => handleFileChange(e, 'diseasePhoto')}
          className="mt-2"
        />
        {diseasePhotos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {diseasePhotos.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <File className="h-4 w-4 text-muted-foreground" />
                <span>{p.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeDiseasePhoto(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Submit KYP (Detailed)'}
        </Button>
      </div>
    </form>
  )
}
