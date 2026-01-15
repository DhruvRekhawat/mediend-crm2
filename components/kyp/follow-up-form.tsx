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
import { format } from 'date-fns'

interface FollowUpFormProps {
  kypSubmissionId: string
  initialData?: {
    admissionDate?: Date | string | null
    surgeryDate?: Date | string | null
    prescription?: string | null
    report?: string | null
    hospitalName?: string | null
    doctorName?: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function FollowUpForm({
  kypSubmissionId,
  initialData,
  onSuccess,
  onCancel,
}: FollowUpFormProps) {
  const [formData, setFormData] = useState({
    admissionDate: initialData?.admissionDate
      ? format(new Date(initialData.admissionDate), 'yyyy-MM-dd')
      : '',
    surgeryDate: initialData?.surgeryDate
      ? format(new Date(initialData.surgeryDate), 'yyyy-MM-dd')
      : '',
    prescription: initialData?.prescription || '',
    report: initialData?.report || '',
    hospitalName: initialData?.hospitalName || '',
    doctorName: initialData?.doctorName || '',
  })

  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [prescriptionFileUrl, setPrescriptionFileUrl] = useState<string>('')
  const [reportFileUrl, setReportFileUrl] = useState<string>('')

  const { uploadFile, uploading } = useFileUpload()

  const handleFileChange = async (file: File | null, type: 'prescription' | 'report') => {
    if (!file) return

    const result = await uploadFile(file)
    if (result) {
      if (type === 'prescription') {
        setPrescriptionFile(file)
        setPrescriptionFileUrl(result.url)
      } else {
        setReportFile(file)
        setReportFileUrl(result.url)
      }
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await apiPost('/api/kyp/follow-up', {
        kypSubmissionId,
        ...formData,
        admissionDate: formData.admissionDate || null,
        surgeryDate: formData.surgeryDate || null,
        prescriptionFileUrl: prescriptionFileUrl || undefined,
        reportFileUrl: reportFileUrl || undefined,
      })

      toast.success('Follow-up submitted successfully')
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit follow-up')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="admissionDate">Admission Date</Label>
          <Input
            id="admissionDate"
            type="date"
            value={formData.admissionDate}
            onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="surgeryDate">Surgery Date</Label>
          <Input
            id="surgeryDate"
            type="date"
            value={formData.surgeryDate}
            onChange={(e) => setFormData({ ...formData, surgeryDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="hospitalName">Hospital Name</Label>
          <Input
            id="hospitalName"
            value={formData.hospitalName}
            onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
            placeholder="Enter hospital name"
          />
        </div>
        <div>
          <Label htmlFor="doctorName">Doctor Name</Label>
          <Input
            id="doctorName"
            value={formData.doctorName}
            onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
            placeholder="Enter doctor name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="prescription">Prescription</Label>
        <Textarea
          id="prescription"
          value={formData.prescription}
          onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
          placeholder="Enter prescription details"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="report">Report</Label>
        <Textarea
          id="report"
          value={formData.report}
          onChange={(e) => setFormData({ ...formData, report: e.target.value })}
          placeholder="Enter report details"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prescription File</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'prescription')}
            />
            {prescriptionFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>{prescriptionFile.name}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Report File</Label>
          <div className="mt-2">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'report')}
            />
            {reportFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                <span>{reportFile.name}</span>
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
        <Button type="submit" disabled={submitting || uploading}>
          {submitting || uploading ? 'Submitting...' : 'Submit Follow-Up'}
        </Button>
      </div>
    </form>
  )
}
