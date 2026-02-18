'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { KYPDetailedForm } from '@/components/kyp/kyp-detailed-form'

interface KYPSubmission {
  id: string
  leadId: string
  disease: string | null
  aadhar: string | null
  pan: string | null
  aadharFileUrl: string | null
  panFileUrl: string | null
  lead: {
    id: string
    leadRef: string
    patientName: string
  }
}

export default function KYPDetailedSubmitPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
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
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!kypSubmission) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.push(`/patient/${leadId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No KYP submission found. Please submit KYP (Basic) first.
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
            <h1 className="text-3xl font-bold">KYP (Call 2 – Detailed)</h1>
            <p className="text-muted-foreground">
              {kypSubmission.lead.leadRef} - {kypSubmission.lead.patientName}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit KYP Detailed</CardTitle>
            <CardDescription>
              Disease/Diagnosis (required) and optional documents. Then you can raise pre-auth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KYPDetailedForm
              leadId={leadId}
              initialDisease={kypSubmission.disease ?? ''}
              initialAadhar={kypSubmission.aadhar ?? ''}
              initialPan={kypSubmission.pan ?? ''}
              initialAadharFileUrl={kypSubmission.aadharFileUrl ?? ''}
              initialPanFileUrl={kypSubmission.panFileUrl ?? ''}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                queryClient.invalidateQueries({ queryKey: ['case-chat', leadId] })
                router.push(`/patient/${leadId}`)
              }}
              onCancel={() => router.push(`/patient/${leadId}`)}
            />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
