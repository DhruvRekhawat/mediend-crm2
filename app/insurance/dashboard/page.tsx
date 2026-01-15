'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreAuthForm } from '@/components/kyp/pre-auth-form'
import { KYPDetailsView } from '@/components/kyp/kyp-details-view'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'

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

export default function InsuranceDashboardPage() {
  const [selectedKYP, setSelectedKYP] = useState<KYPSubmission | null>(null)
  const queryClient = useQueryClient()

  const { data: kypSubmissions, isLoading: kypLoading } = useQuery<KYPSubmission[]>({
    queryKey: ['kyp-submissions', 'insurance'],
    queryFn: () => apiGet<KYPSubmission[]>('/api/kyp'),
  })

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Insurance Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage KYP submissions and pre-authorization</p>
            </div>
          </div>

          {/* KYP Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle>KYP Submissions</CardTitle>
                  <CardDescription>Review KYP submissions, complete pre-authorization, and view follow-up details</CardDescription>
                </CardHeader>
                <CardContent>
                  {kypLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead Ref</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Disease</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Follow-Up</TableHead>
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
                              <TableCell>
                                <Badge
                                  variant={
                                    kyp.status === 'FOLLOW_UP_COMPLETE' || kyp.status === 'COMPLETED'
                                      ? 'default'
                                      : kyp.status === 'PRE_AUTH_COMPLETE'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  {kyp.status.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {kyp.followUpData ? (
                                  <Badge variant="default">Followed Up</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(kyp.submittedAt), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedKYP(kyp)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              No KYP submissions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* KYP Details Dialog with Tabs */}
          {selectedKYP && (
            <Dialog open={!!selectedKYP} onOpenChange={(open) => !open && setSelectedKYP(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>KYP Details & Pre-Authorization</DialogTitle>
                  <DialogDescription>
                    {selectedKYP.lead.leadRef} - {selectedKYP.lead.patientName}
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="kyp-info" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="kyp-info">KYP Information</TabsTrigger>
                    <TabsTrigger value="pre-auth">Pre-Authorization</TabsTrigger>
                    {selectedKYP.followUpData && (
                      <TabsTrigger value="follow-up">Follow-Up Details</TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="kyp-info" className="mt-4">
                    <KYPDetailsView kypSubmission={selectedKYP as any} />
                  </TabsContent>
                  <TabsContent value="pre-auth" className="mt-4">
                    <PreAuthForm
                      kypSubmissionId={selectedKYP.id}
                      initialData={selectedKYP.preAuthData || undefined}
                      isReadOnly={!!selectedKYP.followUpData}
                      onSuccess={() => {
                        setSelectedKYP(null)
                        queryClient.invalidateQueries({ queryKey: ['kyp-submissions'] })
                      }}
                      onCancel={() => setSelectedKYP(null)}
                    />
                  </TabsContent>
                  {selectedKYP.followUpData && (
                    <TabsContent value="follow-up" className="mt-4">
                      <FollowUpDetailsView followUpData={selectedKYP.followUpData as any} />
                    </TabsContent>
                  )}
                </Tabs>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}


