'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'

interface KYPSubmission {
  id: string
  leadId: string
  lead: {
    id: string
    leadRef: string
    patientName: string
  }
  followUpData?: {
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

export default function FollowUpPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.leadId as string

  const { data: kypSubmission, isLoading } = useQuery<KYPSubmission | null>({
    queryKey: ['kyp-submission', leadId],
    queryFn: async () => {
      const submissions = await apiGet<KYPSubmission[]>('/api/kyp')
      return submissions.find((s) => s.leadId === leadId) || null
    },
    enabled: !!leadId,
  })

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading follow-up details...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!kypSubmission || !kypSubmission.followUpData) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/patient/${leadId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No follow-up data found for this patient
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/patient/${leadId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Follow-Up Details</h1>
            <p className="text-muted-foreground">
              {kypSubmission.lead.leadRef} - {kypSubmission.lead.patientName}
            </p>
          </div>
        </div>

        <FollowUpDetailsView followUpData={kypSubmission.followUpData} />
      </div>
    </AuthenticatedLayout>
  )
}
