'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { Loader2 } from 'lucide-react'

interface HospitalSuggestionItem {
  id: string
  hospitalName: string
  tentativeBill?: number | null
  roomRentGeneral?: number | null
  roomRentSingle?: number | null
  roomRentDeluxe?: number | null
  roomRentSemiPrivate?: number | null
  notes?: string | null
}

interface KYPSubmission {
  id: string
  leadId: string
  // KYP fields for auto-fills
  disease: string | null
  aadhar: string | null
  pan: string | null
  aadharFileUrl: string | null
  panFileUrl: string | null
  prescriptionFileUrl: string | null
  location: string | null
  area: string | null
  insuranceType: string | null
  // Lead data
  lead: {
    id: string
    leadRef: string
    patientName: string
    surgeonName?: string | null
    insuranceName?: string | null
    city?: string | null
  }
  preAuthData?: {
    id: string
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
    hospitalSuggestions?: string[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    suggestedHospitals?: HospitalSuggestionItem[] | null
    prescriptionFiles?: Array<{ name: string; url: string }> | null
    investigationFileUrls?: Array<{ name: string; url: string }> | null
    notes?: string | null
    expectedAdmissionDate?: string | null
    expectedSurgeryDate?: string | null
    // Insurance meta (auto-fills)
    sumInsured?: string | null
    balanceInsured?: string | null
    copay?: string | null
    capping?: string | number | null
    roomRent?: string | null
    insurance?: string | null
    tpa?: string | null
  } | null
}

export default function RaisePreAuthPage() {
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

  const preAuth = kypSubmission.preAuthData

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
              Select a hospital from Insurance&apos;s suggestions or request a new hospital.
              Upload required documents and provide disease details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreAuthRaiseForm
              leadId={leadId}
              initialData={
                preAuth
                  ? {
                      requestedHospitalName: preAuth.requestedHospitalName || undefined,
                      requestedRoomType: preAuth.requestedRoomType || undefined,
                      diseaseDescription: preAuth.diseaseDescription || kypSubmission.disease || undefined,
                      diseaseImages: (preAuth.diseaseImages as Array<{ name: string; url: string }>) ?? undefined,
                      hospitalSuggestions: preAuth.hospitalSuggestions ?? undefined,
                      roomTypes: preAuth.roomTypes ?? undefined,
                      suggestedHospitals: preAuth.suggestedHospitals ?? undefined,
                      prescriptionFiles: (preAuth.prescriptionFiles as Array<{ name: string; url: string }>) ?? undefined,
                      investigationFileUrls: (preAuth.investigationFileUrls as Array<{ name: string; url: string }>) ?? undefined,
                      notes: preAuth.notes || undefined,
                      expectedAdmissionDate: preAuth.expectedAdmissionDate || undefined,
                      expectedSurgeryDate: preAuth.expectedSurgeryDate || undefined,
                    }
                  : undefined
              }
              kypData={{
                disease: kypSubmission.disease,
                surgeonName: kypSubmission.lead?.surgeonName,
                insuranceType: kypSubmission.insuranceType
                  ? String(kypSubmission.insuranceType)
                  : undefined,
                aadhar: kypSubmission.aadhar,
                pan: kypSubmission.pan,
                aadharFileUrl: kypSubmission.aadharFileUrl,
                panFileUrl: kypSubmission.panFileUrl,
                prescriptionFileUrl: kypSubmission.prescriptionFileUrl,
                location: kypSubmission.location,
                area: kypSubmission.area,
              }}
              preAuthMeta={{
                sumInsured: preAuth?.sumInsured,
                balanceInsured: preAuth?.balanceInsured,
                copay: preAuth?.copay,
                capping: preAuth?.capping,
                roomRent: preAuth?.roomRent,
                insurance: preAuth?.insurance || kypSubmission.lead?.insuranceName,
                tpa: preAuth?.tpa,
              }}
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
