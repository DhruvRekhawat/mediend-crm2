'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { File, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KYPSubmission {
  id: string
  leadId: string
  aadhar: string | null
  pan: string | null
  insuranceCard: string | null
  disease: string | null
  location: string | null
  remark: string | null
  aadharFileUrl: string | null
  panFileUrl: string | null
  insuranceCardFileUrl: string | null
  otherFiles: Array<{ name: string; url: string }> | null
  status: 'PENDING' | 'PRE_AUTH_COMPLETE' | 'FOLLOW_UP_COMPLETE' | 'COMPLETED'
  submittedAt: string
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
  }
  submittedBy: {
    id: string
    name: string
  }
}

interface KYPDetailsViewProps {
  kypSubmission: KYPSubmission
}

export function KYPDetailsView({ kypSubmission }: KYPDetailsViewProps) {
  const otherFiles = (kypSubmission.otherFiles as Array<{ name: string; url: string }>) || []

  return (
    <div className="space-y-6">
      {/* Lead Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Lead Reference</Label>
              <p className="text-sm font-medium">{kypSubmission.lead.leadRef}</p>
            </div>
            <div>
              <Label>Patient Name</Label>
              <p className="text-sm font-medium">{kypSubmission.lead.patientName}</p>
            </div>
            <div>
              <Label>Phone Number</Label>
              <p className="text-sm">{kypSubmission.lead.phoneNumber}</p>
            </div>
            <div>
              <Label>City</Label>
              <p className="text-sm">{kypSubmission.lead.city}</p>
            </div>
            <div>
              <Label>Hospital</Label>
              <p className="text-sm">{kypSubmission.lead.hospitalName}</p>
            </div>
            <div>
              <Label>Submitted By</Label>
              <p className="text-sm">{kypSubmission.submittedBy.name}</p>
            </div>
            <div>
              <Label>Submitted At</Label>
              <p className="text-sm">{format(new Date(kypSubmission.submittedAt), 'PPpp')}</p>
            </div>
            <div>
              <Label>Status</Label>
              <Badge variant="secondary" className="mt-1">
                {kypSubmission.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYP Information */}
      <Card>
        <CardHeader>
          <CardTitle>KYP Information</CardTitle>
          <CardDescription>Patient details submitted by Sales team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Aadhar</Label>
              <p className="text-sm">{kypSubmission.aadhar || '-'}</p>
            </div>
            <div>
              <Label>PAN</Label>
              <p className="text-sm">{kypSubmission.pan || '-'}</p>
            </div>
            <div>
              <Label>Insurance Card</Label>
              <p className="text-sm">{kypSubmission.insuranceCard || '-'}</p>
            </div>
            <div>
              <Label>Disease</Label>
              <p className="text-sm">{kypSubmission.disease || '-'}</p>
            </div>
            <div>
              <Label>Location (City)</Label>
              <p className="text-sm">{kypSubmission.location || '-'}</p>
            </div>
            <div>
              <Label>Remark</Label>
              <p className="text-sm">{kypSubmission.remark || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {(kypSubmission.aadharFileUrl ||
        kypSubmission.panFileUrl ||
        kypSubmission.insuranceCardFileUrl ||
        otherFiles.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>Files uploaded with KYP submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kypSubmission.aadharFileUrl && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Aadhar Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(kypSubmission.aadharFileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              )}
              {kypSubmission.panFileUrl && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">PAN Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(kypSubmission.panFileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              )}
              {kypSubmission.insuranceCardFileUrl && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Insurance Card Document</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(kypSubmission.insuranceCardFileUrl!, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              )}
              {otherFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(file.url, '_blank')}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
