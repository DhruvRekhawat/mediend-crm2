'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, MessageSquare, ClipboardList, Receipt } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { KYPDetailsView } from '@/components/kyp/kyp-details-view'
import { PreAuthForm } from '@/components/kyp/pre-auth-form'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'
import { StageProgress } from '@/components/case/stage-progress'
import { ActivityTimeline } from '@/components/case/activity-timeline'
import { format } from 'date-fns'
import Link from 'next/link'
import { CaseStage } from '@prisma/client'
import { canAddKYPDetails, canCompletePreAuth } from '@/lib/case-permissions'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'

interface Lead {
  id: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  hospitalName: string
  treatment: string | null
  category: string | null
  status: string
  pipelineStage: string
  caseStage: CaseStage
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
    submittedBy: {
      id: string
      name: string
    }
    preAuthData?: {
      id: string
    } | null
    followUpData?: {
      id: string
    } | null
  } | null
  dischargeSheet?: {
    id: string
  } | null
}

export default function PatientDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.leadId as string

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const { data: stageHistory } = useQuery<any[]>({
    queryKey: ['stage-history', leadId],
    queryFn: () => apiGet<any[]>(`/api/leads/${leadId}/stage-history`),
    enabled: !!leadId,
  })

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading patient details...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!lead) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Patient not found</div>
        </div>
      </AuthenticatedLayout>
    )
  }

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{lead.patientName}</h1>
              <p className="text-muted-foreground">
                {lead.leadRef} • {lead.hospitalName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{lead.pipelineStage}</Badge>
            <Badge variant="secondary">{lead.status}</Badge>
          </div>
        </div>

        {/* Stage Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Case Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <StageProgress currentStage={lead.caseStage} />
          </CardContent>
        </Card>

        {/* Patient Info Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{lead.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{lead.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Treatment</p>
                <p className="font-medium">{lead.treatment || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{lead.category || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance: where to add KYP details / pre-auth */}
        {user && (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') && lead && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              {canAddKYPDetails(user, lead) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium">Add your KYP details</p>
                    <p className="text-sm text-muted-foreground">
                      Add hospital suggestions, room types, TPA, and coverage. BD will then raise pre-auth from your list.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Add KYP Details →
                    </Link>
                  </Button>
                </div>
              )}
              {canCompletePreAuth(user, lead) && !canAddKYPDetails(user, lead) && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium">Complete pre-authorization</p>
                    <p className="text-sm text-muted-foreground">
                      BD has raised pre-auth. Review and complete.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Complete Pre-Auth →
                    </Link>
                  </Button>
                </div>
              )}
              {!canAddKYPDetails(user, lead) && !canCompletePreAuth(user, lead) && lead.kypSubmission && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium">Pre-Auth &amp; KYP details</p>
                    <p className="text-sm text-muted-foreground">
                      You add details (hospitals, room types, TPA) on the <strong>Pre-Auth</strong> page when the case is <strong>KYP Pending</strong> (after BD submits KYP). Current stage: <strong>{lead.caseStage.replace(/_/g, ' ')}</strong>.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Open Pre-Auth →
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="kyp" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kyp" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              KYP
              {lead.kypSubmission && (
                <Badge variant="secondary" className="ml-1">
                  {getKYPStatusLabel(lead.kypSubmission.status)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pre-auth" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Pre-Auth
              {lead.caseStage === CaseStage.PREAUTH_COMPLETE && (
                <Badge variant="secondary" className="ml-1">Complete</Badge>
              )}
            </TabsTrigger>
            {lead.kypSubmission?.followUpData && (
              <TabsTrigger value="follow-up" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Follow-Up
              </TabsTrigger>
            )}
            {lead.dischargeSheet && (
              <TabsTrigger value="discharge" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Discharge Sheet
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="kyp">
            {lead.kypSubmission ? (
              <Link href={`/patient/${leadId}/kyp`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardHeader>
                    <CardTitle>KYP Submission</CardTitle>
                    <CardDescription>
                      Submitted on {format(new Date(lead.kypSubmission.submittedAt), 'PPpp')} by {lead.kypSubmission.submittedBy.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {getStatusBadge(lead.kypSubmission.status)}
                      <Button variant="outline">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No KYP submission found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pre-auth">
            <Link href={`/patient/${leadId}/pre-auth`}>
              <Card className="cursor-pointer hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle>Pre-Authorization</CardTitle>
                  <CardDescription>
                    {lead.caseStage === CaseStage.PREAUTH_COMPLETE
                      ? 'Pre-authorization completed'
                      : 'Pre-authorization pending'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">View Details</Button>
                </CardContent>
              </Card>
            </Link>
          </TabsContent>

          {lead.kypSubmission?.followUpData && (
            <TabsContent value="follow-up">
              <Link href={`/patient/${leadId}/follow-up`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardHeader>
                    <CardTitle>Follow-Up Details</CardTitle>
                    <CardDescription>Patient follow-up information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">View Details</Button>
                  </CardContent>
                </Card>
              </Link>
            </TabsContent>
          )}

          {lead.dischargeSheet && (
            <TabsContent value="discharge">
              <Link href={`/patient/${leadId}/discharge`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardHeader>
                    <CardTitle>Discharge Sheet</CardTitle>
                    <CardDescription>Patient discharge information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">View Details</Button>
                  </CardContent>
                </Card>
              </Link>
            </TabsContent>
          )}
        </Tabs>

        {/* Activity Timeline */}
        {stageHistory && <ActivityTimeline history={stageHistory} />}
      </div>
    </AuthenticatedLayout>
  )
}
