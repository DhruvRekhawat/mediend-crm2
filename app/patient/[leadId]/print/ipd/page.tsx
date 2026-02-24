'use client'

import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { PrinterIcon, ArrowLeft } from 'lucide-react'

interface Lead {
  id: string
  patientName: string
  leadRef: string
  phoneNumber: string
  city: string
  hospitalName: string
  admissionRecord?: {
    id: string
    admissionDate?: string
    admissionTime?: string
    surgeryDate?: string
    surgeryTime?: string
    admittingHospital?: string
    hospitalAddress?: string
    googleMapLocation?: string
    tpa?: string
    instrument?: string
    implantConsumables?: string
    notes?: string
    ipdStatus?: string
    ipdStatusReason?: string
    ipdStatusNotes?: string
    ipdStatusUpdatedAt?: string
    newSurgeryDate?: string
    ipdDischargeDate?: string
  } | null
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  try {
    return format(new Date(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

export default function IPDPrintPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.leadId as string

  // Check authorization: only BD, TEAM_LEAD, INSURANCE_HEAD, ADMIN
  const isAuthorized = user && ['BD', 'TEAM_LEAD', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)

  const { data: lead, isLoading } = useQuery<Lead | null>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId && isAuthorized,
  })

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You do not have permission to view this page.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading IPD details...</div>
      </div>
    )
  }

  if (!lead || !lead.admissionRecord) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              IPD details not found for this patient.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rec = lead.admissionRecord

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header - hidden in print */}
      <div className="print:hidden border-b p-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">IPD Admission Details</h1>
          <p className="text-muted-foreground">
            {lead.leadRef} - {lead.patientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
          >
            <PrinterIcon className="h-4 w-4 mr-1" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Title for print */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold mb-2">IPD Admission Details</h1>
          <p className="text-sm text-gray-600">
            {lead.leadRef} - {lead.patientName}
          </p>
        </div>

        {/* Patient Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Patient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Patient Name</p>
              <p className="text-base">{lead.patientName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Lead Reference</p>
              <p className="text-base">{lead.leadRef}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Phone Number</p>
              <p className="text-base">{lead.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">City</p>
              <p className="text-base">{lead.city}</p>
            </div>
          </div>
        </div>

        {/* IPD Status */}
        {rec.ipdStatus && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold mb-2">IPD Status</h3>
            <p className="text-base font-bold text-blue-700 mb-1">{rec.ipdStatus.replace(/_/g, ' ')}</p>
            {rec.ipdStatusUpdatedAt && (
              <p className="text-sm text-gray-600">
                Updated {format(new Date(rec.ipdStatusUpdatedAt), 'dd MMM yyyy, HH:mm')}
              </p>
            )}
            {rec.ipdStatusReason && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600">Reason</p>
                <p className="text-sm">{rec.ipdStatusReason}</p>
              </div>
            )}
            {rec.ipdStatusNotes && (
              <div className="mt-2">
                <p className="text-sm font-semibold text-gray-600">Notes</p>
                <p className="text-sm whitespace-pre-line">{rec.ipdStatusNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Admission & Surgery Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Admission & Surgery Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Admission Date</p>
              <p className="text-base">{formatDate(rec.admissionDate)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Admission Time</p>
              <p className="text-base">{rec.admissionTime || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                {rec.ipdStatus === 'POSTPONED' && rec.newSurgeryDate ? 'Original Surgery Date' : 'Surgery Date'}
              </p>
              <p className="text-base">{formatDate(rec.surgeryDate)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Surgery Time</p>
              <p className="text-base">{rec.surgeryTime || '-'}</p>
            </div>
            {rec.ipdStatus === 'POSTPONED' && rec.newSurgeryDate && (
              <div>
                <p className="text-sm font-semibold text-gray-600">New Surgery Date</p>
                <p className="text-base font-semibold text-amber-600">{formatDate(rec.newSurgeryDate)}</p>
              </div>
            )}
            {rec.ipdStatus === 'DISCHARGED' && rec.ipdDischargeDate && (
              <div>
                <p className="text-sm font-semibold text-gray-600">Discharge Date</p>
                <p className="text-base font-semibold text-green-600">{formatDate(rec.ipdDischargeDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Hospital Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 border-b pb-2">Hospital Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Admitting Hospital</p>
              <p className="text-base">{rec.admittingHospital || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Hospital Address</p>
              <p className="text-base">{rec.hospitalAddress || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">TPA</p>
              <p className="text-base">{rec.tpa || '-'}</p>
            </div>
          </div>
          {rec.googleMapLocation && (
            <div className="mt-3">
              <a
                href={rec.googleMapLocation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View on Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Medical Details */}
        {(rec.instrument || rec.implantConsumables) && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">Medical Details</h2>
            <div className="space-y-3">
              {rec.instrument && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Instruments</p>
                  <p className="text-sm whitespace-pre-line">{rec.instrument}</p>
                </div>
              )}
              {rec.implantConsumables && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Implants/Consumables</p>
                  <p className="text-sm whitespace-pre-line">{rec.implantConsumables}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {rec.notes && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b pb-2">Additional Notes</h2>
            <p className="text-sm whitespace-pre-line">{rec.notes}</p>
          </div>
        )}
      </div>

      {/* Footer - hidden in print */}
      <div className="print:hidden border-t p-4 text-center">
        <Button
          size="lg"
          onClick={() => window.print()}
        >
          <PrinterIcon className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>
    </div>
  )
}
