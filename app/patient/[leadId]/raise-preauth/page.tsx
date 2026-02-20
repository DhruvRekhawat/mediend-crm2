'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { Loader2 } from 'lucide-react'

interface KYPSubmission {
  id: string
  leadId: string
  disease: string | null
  preAuthData?: {
    id: string
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
    hospitalSuggestions?: string[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    suggestedHospitals?: Array<{
      id: string
      hospitalName: string
      tentativeBill?: number | null
      roomRentGeneral?: number | null
      roomRentPrivate?: number | null
      roomRentICU?: number | null
      notes?: string | null
    }> | null
  } | null
}

export default function RaisePreAuthPage() {
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!kypSubmission) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">KYP submission not found</div>
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
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Raise Pre-Auth</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Select hospital and room type from Insurance suggestions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pre-Auth Request Form</CardTitle>
            <CardDescription>
              Select a hospital from Insurance&apos;s suggestions or request a new hospital. Provide disease details and upload relevant documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreAuthRaiseForm
              leadId={leadId}
              initialData={kypSubmission.preAuthData ? {
                requestedHospitalName: kypSubmission.preAuthData.requestedHospitalName || undefined,
                requestedRoomType: kypSubmission.preAuthData.requestedRoomType || undefined,
                diseaseDescription: kypSubmission.preAuthData.diseaseDescription || kypSubmission.disease || undefined,
                diseaseImages: kypSubmission.preAuthData.diseaseImages as Array<{ name: string; url: string }> | undefined,
                hospitalSuggestions: kypSubmission.preAuthData.hospitalSuggestions ?? undefined,
                roomTypes: kypSubmission.preAuthData.roomTypes ?? undefined,
                suggestedHospitals: kypSubmission.preAuthData.suggestedHospitals ?? undefined,
              } : undefined}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                router.push(`/patient/${leadId}`)
              }}
              onCancel={() => {
                router.push(`/patient/${leadId}`)
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
