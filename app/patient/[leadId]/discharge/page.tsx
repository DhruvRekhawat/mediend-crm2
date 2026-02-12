'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { DischargeSheetView } from '@/components/discharge/discharge-sheet-view'
import { DischargeSheetForm } from '@/components/discharge/discharge-sheet-form'

interface DischargeSheet {
  id: string
  leadId: string
  month: string | null
  dischargeDate: string | null
  surgeryDate: string | null
  status: string | null
  paymentType: string | null
  approvedOrCash: string | null
  paymentCollectedAt: string | null
  managerRole: string | null
  managerName: string | null
  bdmName: string | null
  patientName: string | null
  patientPhone: string | null
  doctorName: string | null
  hospitalName: string | null
  category: string | null
  treatment: string | null
  circle: string | null
  leadSource: string | null
  totalAmount: number
  billAmount: number
  cashPaidByPatient: number
  cashOrDedPaid: number
  referralAmount: number
  cabCharges: number
  implantCost: number
  dcCharges: number
  doctorCharges: number
  hospitalSharePct: number | null
  hospitalShareAmount: number
  mediendSharePct: number | null
  mediendShareAmount: number
  mediendNetProfit: number
  remarks: string | null
  lead: {
    id: string
    leadRef: string
    patientName: string
    kypSubmission?: {
      preAuthData?: {
        sumInsured?: string | null
        roomRent?: string | null
      } | null
    } | null
  }
  [key: string]: unknown
}

export default function DischargeSheetPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const leadId = params.leadId as string

  const { data: dischargeSheet, isLoading } = useQuery<DischargeSheet | null>({
    queryKey: ['discharge-sheet', leadId],
    queryFn: async () => {
      const data = await apiGet<DischargeSheet[]>(`/api/discharge-sheet?leadId=${leadId}`)
      if (Array.isArray(data) && data.length > 0) {
        return data[0]
      }
      return null
    },
    enabled: !!leadId,
  })

  const isInsurance = user?.role === 'INSURANCE_HEAD' || user?.role === 'ADMIN'

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading discharge sheet...</div>
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
            <h1 className="text-3xl font-bold">Discharge Sheet</h1>
            <p className="text-muted-foreground">
              {dischargeSheet?.lead.leadRef || 'Loading...'} - {dischargeSheet?.lead.patientName || 'Loading...'}
            </p>
          </div>
        </div>

        {dischargeSheet ? (
          <DischargeSheetView dischargeSheet={dischargeSheet} />
        ) : isInsurance ? (
          <DischargeSheetForm
            leadId={leadId}
            onSuccess={async () => {
              await queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
              router.push(`/patient/${leadId}`)
            }}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No discharge sheet found. Only Insurance team can create discharge sheets.
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
