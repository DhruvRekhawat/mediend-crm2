'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { File, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FollowUpData {
  id: string
  admissionDate: string | null
  surgeryDate: string | null
  prescription: string | null
  report: string | null
  hospitalName: string | null
  doctorName: string | null
  prescriptionFileUrl?: string | null
  reportFileUrl?: string | null
  updatedAt?: string
  updatedBy: {
    id: string
    name: string
  } | null
}

interface FollowUpDetailsViewProps {
  followUpData: FollowUpData
}

export function FollowUpDetailsView({ followUpData }: FollowUpDetailsViewProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Follow-Up Details</CardTitle>
          <CardDescription>Follow-up information collected by Sales team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Admission Date</Label>
              <p className="text-sm font-medium mt-1">
                {followUpData.admissionDate
                  ? format(new Date(followUpData.admissionDate), 'PP')
                  : '-'}
              </p>
            </div>
            <div>
              <Label>Surgery Date</Label>
              <p className="text-sm font-medium mt-1">
                {followUpData.surgeryDate
                  ? format(new Date(followUpData.surgeryDate), 'PP')
                  : '-'}
              </p>
            </div>
            <div>
              <Label>Hospital Name</Label>
              <p className="text-sm font-medium mt-1">
                {followUpData.hospitalName || '-'}
              </p>
            </div>
            <div>
              <Label>Doctor Name</Label>
              <p className="text-sm font-medium mt-1">
                {followUpData.doctorName || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <Label>Prescription</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {followUpData.prescription || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <Label>Report</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {followUpData.report || '-'}
              </p>
            </div>
            {followUpData.updatedBy && (
              <div>
                <Label>Updated By</Label>
                <p className="text-sm font-medium mt-1">
                  {followUpData.updatedBy.name}
                </p>
              </div>
            )}
            {followUpData.updatedAt && (
              <div>
                <Label>Updated At</Label>
                <p className="text-sm font-medium mt-1">
                  {format(new Date(followUpData.updatedAt), 'PPpp')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {(followUpData.prescriptionFileUrl || followUpData.reportFileUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-Up Documents</CardTitle>
            <CardDescription>Files uploaded with follow-up details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {followUpData.prescriptionFileUrl && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Prescription Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(followUpData.prescriptionFileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              )}
              {followUpData.reportFileUrl && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Report Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(followUpData.reportFileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
