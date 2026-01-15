'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useFileUpload } from '@/hooks/use-file-upload'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { Upload, X, File } from 'lucide-react'

interface KYPFormProps {
  leadId: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface FileWithUrl {
  name: string
  url: string
  file?: File
}

export function KYPForm({ leadId, onSuccess, onCancel }: KYPFormProps) {
  const [formData, setFormData] = useState({
    aadhar: '',
    pan: '',
    insuranceCard: '',
    disease: '',
    location: '',
    remark: '',
    aadharFileUrl: '',
    panFileUrl: '',
    insuranceCardFileUrl: '',
  })

  const [aadharFile, setAadharFile] = useState<File | null>(null)
  const [panFile, setPanFile] = useState<File | null>(null)
  const [insuranceCardFile, setInsuranceCardFile] = useState<File | null>(null)
  const [otherFiles, setOtherFiles] = useState<FileWithUrl[]>([])

  const { uploadFile, uploading } = useFileUpload()

  const handleFileChange = async (
    file: File | null,
    type: 'aadhar' | 'pan' | 'insuranceCard' | 'other'
  ) => {
    if (!file) return

    if (type === 'other') {
      const result = await uploadFile(file)
      if (result) {
        setOtherFiles([...otherFiles, { name: file.name, url: result.url, file }])
      }
    } else {
      const result = await uploadFile(file)
      if (result) {
        if (type === 'aadhar') {
          setAadharFile(file)
          setFormData({ ...formData, aadharFileUrl: result.url })
        } else if (type === 'pan') {
          setPanFile(file)
          setFormData({ ...formData, panFileUrl: result.url })
        } else if (type === 'insuranceCard') {
          setInsuranceCardFile(file)
          setFormData({ ...formData, insuranceCardFileUrl: result.url })
        }
      }
    }
  }

  const removeOtherFile = (index: number) => {
    setOtherFiles(otherFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate that at least one field is filled
    const hasData =
      formData.aadhar ||
      formData.pan ||
      formData.insuranceCard ||
      formData.disease ||
      formData.location ||
      formData.remark ||
      aadharFile ||
      panFile ||
      insuranceCardFile ||
      otherFiles.length > 0

    if (!hasData) {
      toast.error('At least one field must be filled')
      return
    }

    try {
      await apiPost('/api/kyp/submit', {
        leadId,
        ...formData,
        aadharFileUrl: formData.aadharFileUrl || undefined,
        panFileUrl: formData.panFileUrl || undefined,
        insuranceCardFileUrl: formData.insuranceCardFileUrl || undefined,
        otherFiles: otherFiles.map((f) => ({ name: f.name, url: f.url })),
      })

      toast.success('KYP submitted successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit KYP')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="aadhar">Aadhar</Label>
          <Input
            id="aadhar"
            value={formData.aadhar}
            onChange={(e) => setFormData({ ...formData, aadhar: e.target.value })}
            placeholder="Enter Aadhar number"
          />
        </div>
        <div>
          <Label htmlFor="pan">PAN</Label>
          <Input
            id="pan"
            value={formData.pan}
            onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
            placeholder="Enter PAN number"
          />
        </div>
        <div>
          <Label htmlFor="insuranceCard">Insurance Card</Label>
          <Input
            id="insuranceCard"
            value={formData.insuranceCard}
            onChange={(e) => setFormData({ ...formData, insuranceCard: e.target.value })}
            placeholder="Enter insurance card number"
          />
        </div>
        <div>
          <Label htmlFor="disease">Disease</Label>
          <Input
            id="disease"
            value={formData.disease}
            onChange={(e) => setFormData({ ...formData, disease: e.target.value })}
            placeholder="Enter disease name"
          />
        </div>
        <div>
          <Label htmlFor="location">Location (City)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Enter city name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="remark">Remark</Label>
        <Textarea
          id="remark"
          value={formData.remark}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          placeholder="Enter any remarks"
          rows={3}
        />
      </div>

      {/* File Uploads */}
      <div className="space-y-4">
        <div>
          <Label>Aadhar Document</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'aadhar')}
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
          <Label>PAN Document</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'pan')}
            />
            {panFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>{panFile.name}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Insurance Card Document</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'insuranceCard')}
            />
            {insuranceCardFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>{insuranceCardFile.name}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Other Documents</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'other')}
            />
            {otherFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {otherFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border p-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <File className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeOtherFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
          {uploading ? 'Uploading...' : 'Submit KYP'}
        </Button>
      </div>
    </form>
  )
}
