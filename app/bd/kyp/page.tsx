'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KYPForm } from '@/components/kyp/kyp-form'
import { format } from 'date-fns'
import { Eye, Plus } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { useRouter } from 'next/navigation'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'

interface KYPSubmission {
  id: string
  leadId: string
  aadhar: string | null
  pan: string | null
  insuranceCard: string | null
  disease: string | null
  location: string | null
  remark: string | null
  status: 'PENDING' | 'KYP_DETAILS_ADDED' | 'PRE_AUTH_COMPLETE' | 'FOLLOW_UP_COMPLETE' | 'COMPLETED'
  submittedAt: string
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
  }
  preAuthData: {
    id: string
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    hospitalNameSuggestion: string | null
    insurance: string | null
    tpa: string | null
    handledAt: string
  } | null
  followUpData: {
    id: string
    admissionDate: string | null
    surgeryDate: string | null
    prescription: string | null
    report: string | null
    hospitalName: string | null
    doctorName: string | null
    prescriptionFileUrl: string | null
    reportFileUrl: string | null
    updatedAt: string
    updatedBy: {
      id: string
      name: string
    } | null
  } | null
}

export default function KYPPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [showKYPForm, setShowKYPForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data: kypSubmissions, isLoading } = useQuery<KYPSubmission[]>({
    queryKey: ['kyp-submissions', user?.id],
    queryFn: () => apiGet<KYPSubmission[]>('/api/kyp'),
  })

  const { leads } = useLeads({ bdId: user?.id })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      KYP_DETAILS_ADDED: 'default',
      PRE_AUTH_COMPLETE: 'default',
      FOLLOW_UP_COMPLETE: 'default',
      COMPLETED: 'default',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {getKYPStatusLabel(status)}
      </Badge>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Know Your Patient (KYP)</h1>
              <p className="text-muted-foreground mt-1">Manage KYP submissions and follow-ups</p>
            </div>
            <Button onClick={() => setShowKYPForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New KYP Submission
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>KYP Submissions</CardTitle>
              <CardDescription>All your KYP submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Ref</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Disease</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kypSubmissions && kypSubmissions.length > 0 ? (
                      kypSubmissions.map((kyp) => (
                        <TableRow key={kyp.id}>
                          <TableCell className="font-medium">{kyp.lead.leadRef}</TableCell>
                          <TableCell>{kyp.lead.patientName}</TableCell>
                          <TableCell>{kyp.location || kyp.lead.city}</TableCell>
                          <TableCell>{kyp.disease || '-'}</TableCell>
                          <TableCell>{getStatusBadge(kyp.status)}</TableCell>
                          <TableCell>
                            {format(new Date(kyp.submittedAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/patient/${kyp.leadId}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No KYP submissions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* KYP Form Dialog */}
          <Dialog open={showKYPForm} onOpenChange={setShowKYPForm}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New KYP Submission</DialogTitle>
                <DialogDescription>Select a lead to submit KYP</DialogDescription>
              </DialogHeader>
              {!selectedLeadId ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {leads.map((lead) => (
                    <Button
                      key={lead.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      {lead.leadRef} - {lead.patientName}
                    </Button>
                  ))}
                </div>
              ) : (
                <KYPForm
                  leadId={selectedLeadId}
                  onSuccess={() => {
                    setShowKYPForm(false)
                    setSelectedLeadId(null)
                  }}
                  onCancel={() => {
                    setShowKYPForm(false)
                    setSelectedLeadId(null)
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </AuthenticatedLayout>
  )
}
