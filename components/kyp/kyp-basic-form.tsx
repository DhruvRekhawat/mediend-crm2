'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFileUpload } from '@/hooks/use-file-upload'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { File } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { canViewPhoneNumber } from '@/lib/case-permissions'
import CITIES from '@/data/indian-cities'
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { validateAadhaar, validatePAN } from '@/lib/validations'

interface KYPBasicFormProps {
  leadId: string
  initialPatientName?: string
  initialPhone?: string
  initialAge?: number
  initialSex?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function KYPBasicForm({
  leadId,
  initialPatientName = '',
  initialPhone = '',
  initialAge,
  initialSex = '',
  onSuccess,
  onCancel,
}: KYPBasicFormProps) {
  const { user } = useAuth()
  const canViewPhone = canViewPhoneNumber(user)
  const [formData, setFormData] = useState({
    location: '',
    area: '',
    patientName: initialPatientName,
    phone: initialPhone,
    age: initialAge || '',
    sex: initialSex,
    disease: '',
    insuranceType: '',
    remark: '',
    insuranceName: '',
    doctorName: '',
    aadhar: '',
    pan: '',
  })
  const [insuranceFiles, setInsuranceFiles] = useState<{ name: string; url: string }[]>([])
  const [aadharFile, setAadharFile] = useState<{ name: string; url: string } | null>(null)
  const [panFile, setPanFile] = useState<{ name: string; url: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { uploadFile, uploading } = useFileUpload()

  // Fuzzy search function - checks if search term is contained in the city name
  // Case insensitive and handles partial matches (e.g., "DEL" matches "West Delhi")
  const fuzzyMatch = (city: string, searchTerm: string): boolean => {
    const cityLower = city.toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    return cityLower.includes(searchLower)
  }

  // Filter cities based on search input with fuzzy matching
  const filteredCities = useMemo(() => {
    if (!formData.location.trim()) return []
    return CITIES.filter((city) => fuzzyMatch(city, formData.location)).slice(0, 10)
  }, [formData.location])

  const handleInsuranceCardsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = await uploadFile(file)
      if (result) {
        setInsuranceFiles(prev => [...prev, { name: file.name, url: result.url }])
      }
    }
  }

  const handleAadharChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file)
    if (result) {
      setAadharFile({ name: file.name, url: result.url })
    }
  }

  const handlePanChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file)
    if (result) {
      setPanFile({ name: file.name, url: result.url })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (insuranceFiles.length === 0) {
      newErrors.insurance = 'At least one insurance card upload is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'City is required'
    }
    if (!formData.area.trim()) {
      newErrors.area = 'Area is required'
    }
    if (!formData.disease.trim()) {
      newErrors.disease = 'Disease/Treatment is required'
    }
    if (!formData.doctorName.trim()) {
      newErrors.doctorName = 'Surgeon/Doctor Name is required'
    }
    if (!formData.insuranceType) {
      newErrors.insuranceType = 'Insurance Type is required'
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
        patientName: formData.patientName.trim(),
        phone: formData.phone.trim(),
        age: formData.age ? parseInt(formData.age as string) : undefined,
        sex: formData.sex,
        location: formData.location.trim(),
        area: formData.area.trim(),
        disease: formData.disease.trim(),
        insuranceType: formData.insuranceType,
        insuranceName: formData.insuranceName.trim(),
        doctorName: formData.doctorName.trim(),
        aadhar: formData.aadhar.trim(),
        pan: formData.pan.trim(),
        insuranceCardFiles: insuranceFiles,
        aadharFileUrl: aadharFile?.url,
        panFileUrl: panFile?.url,
        remark: formData.remark.trim() || undefined,
      })
      toast.success('KYP (Basic) submitted. Insurance will suggest hospitals.')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit KYP')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patientName">Patient Name *</Label>
          <Input
            id="patientName"
            value={formData.patientName}
            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            placeholder="Enter patient name"
            required
          />
        </div>
        {canViewPhone && (
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">City *</Label>
          <Combobox
            value={formData.location || ''}
            onValueChange={(value) => {
              if (value) {
                setFormData({ ...formData, location: value })
              }
            }}
          >
            <ComboboxInput
              placeholder="Search city or enter manually"
              className={cn("w-full")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, location: e.target.value })
              }
              value={formData.location}
            />
            {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
            {formData.location.trim() && (
              <ComboboxContent>
                <ComboboxList>
                  {filteredCities.length > 0 ? (
                    filteredCities.map((city) => (
                      <ComboboxItem key={city} value={city}>
                        {city}
                      </ComboboxItem>
                    ))
                  ) : (
                    <ComboboxEmpty>
                      No cities found. You can enter manually.
                    </ComboboxEmpty>
                  )}
                </ComboboxList>
              </ComboboxContent>
            )}
          </Combobox>
        </div>
        <div>
          <Label htmlFor="area">Area *</Label>
          <Input
            id="area"
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            placeholder="Enter area"
            required
          />
          {errors.area && <p className="text-xs text-destructive mt-1">{errors.area}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="insuranceName">Insurance Name</Label>
          <Input
            id="insuranceName"
            value={formData.insuranceName}
            onChange={(e) => setFormData({ ...formData, insuranceName: e.target.value })}
            placeholder="Enter insurance company name"
          />
        </div>
        <div>
          <Label htmlFor="doctorName">Surgeon/Doctor Name *</Label>
          <Input
            id="doctorName"
            value={formData.doctorName}
            onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
            placeholder="Enter doctor name"
            required
          />
          {errors.doctorName && <p className="text-xs text-destructive mt-1">{errors.doctorName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="disease">Disease/Treatment *</Label>
          <Textarea
            id="disease"
            value={formData.disease}
            onChange={(e) => setFormData({ ...formData, disease: e.target.value })}
            placeholder="Describe the disease or treatment needed"
            required
          />
          {errors.disease && <p className="text-xs text-destructive mt-1">{errors.disease}</p>}
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="insuranceType">Insurance Type *</Label>
            <select
              id="insuranceType"
              value={formData.insuranceType}
              onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md"
              required
            >
              <option value="">Select insurance type</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="FAMILY_FLOATER">Family Floater</option>
              <option value="GROUP_CORPORATE">Group/Corporate</option>
            </select>
            {errors.insuranceType && <p className="text-xs text-destructive mt-1">{errors.insuranceType}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            min="0"
            max="150"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            placeholder="Optional"
          />
        </div>
        <div>
          <Label htmlFor="sex">Gender</Label>
          <select
            id="sex"
            value={formData.sex}
            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
            className="w-full px-3 py-2 border border-input bg-background rounded-md"
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="aadhar">Aadhaar Number</Label>
          <Input
            id="aadhar"
            value={formData.aadhar}
            onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
            placeholder="Optional"
          />
          {errors.aadhar && <p className="text-xs text-destructive mt-1">{errors.aadhar}</p>}
        </div>
        <div>
          <Label htmlFor="pan">PAN Number</Label>
          <Input
            id="pan"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
            placeholder="Optional"
          />
          {errors.pan && <p className="text-xs text-destructive mt-1">{errors.pan}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Insurance Cards (Multiple) *</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleInsuranceCardsChange}
            />
            {errors.insurance && <p className="text-xs text-destructive mt-1">{errors.insurance}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {insuranceFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded-md">
                  <File className="h-4 w-4" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => setInsuranceFiles(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Aadhaar Card (upload)</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleAadharChange}
              />
              {aadharFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <File className="h-4 w-4" />
                  <span>{aadharFile.name}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <Label>PAN Card (upload)</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handlePanChange}
              />
              {panFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <File className="h-4 w-4" />
                  <span>{panFile.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="remark">Notes</Label>
        <Textarea
          id="remark"
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          placeholder="Optional notes"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Submit KYP (Basic)'}
        </Button>
      </div>
    </form>
  )
}
