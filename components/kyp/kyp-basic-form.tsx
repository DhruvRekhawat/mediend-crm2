'use client'

import { useState } from 'react'
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

interface KYPBasicFormProps {
  leadId: string
  initialPatientName?: string
  initialPhone?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function KYPBasicForm({
  leadId,
  initialPatientName = '',
  initialPhone = '',
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
    remark: '',
  })
  const [insuranceCardFileUrl, setInsuranceCardFileUrl] = useState('')
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null)
  const { uploadFile, uploading } = useFileUpload()

  const handleInsuranceCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file)
    if (result) {
      setInsuranceCardFile(file)
      setInsuranceCardFileUrl(result.url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!insuranceCardFileUrl.trim()) {
      toast.error('Insurance card upload is required')
      return
    }
    if (!formData.location.trim()) {
      toast.error('City is required')
      return
    }
    if (!formData.area.trim()) {
      toast.error('Area is required')
      return
    }

    try {
      await apiPost('/api/kyp/submit', {
        leadId,
        type: 'basic',
        insuranceCardFileUrl,
        location: formData.location.trim(),
        area: formData.area.trim(),
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
      <div>
        <Label>Insurance Card (upload) *</Label>
        <div className="mt-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleInsuranceCardChange}
          />
          {insuranceCardFile && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>{insuranceCardFile.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="location">City *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Enter city"
            required
          />
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
        </div>
        <div>
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            value={formData.patientName}
            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            placeholder="Optional"
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
