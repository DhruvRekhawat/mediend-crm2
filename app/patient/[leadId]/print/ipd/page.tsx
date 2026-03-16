'use client'

import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api-client'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { PrinterIcon, ArrowLeft } from 'lucide-react'
import { getIpdStatusLabel } from '@/lib/ipd-status-labels'

interface Lead {
  id: string
  patientName: string
  leadRef: string
  age?: number | null
  sex?: string | null
  phoneNumber: string
  circle?: string | null
  hospitalName: string
  treatment?: string | null
  ipdDrName?: string | null
  insuranceName?: string | null
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
  bd?: { name?: string | null; manager?: { name?: string | null } | null; team?: { salesHead?: { name?: string | null } | null } | null } | null
  kypSubmission?: {
    insuranceType?: string | null
    preAuthData?: {
      sumInsured?: string | null
      balanceInsured?: string | null
      copay?: string | null
      capping?: number | string | null
      roomRent?: string | null
      tpa?: string | null
      requestedHospitalName?: string | null
      requestedRoomType?: string | null
      roomTypes?: Array<{ name: string; rent: string }> | null
    } | null
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

const fmtCurr = (v: number | string | null | undefined) => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isNaN(n)) return null
  return `₹${n.toLocaleString('en-IN')}`
}

export default function IPDPrintPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const leadId = params.leadId as string

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
  const preAuth = lead.kypSubmission?.preAuthData
  const bdManagerName = lead.bd?.manager?.name ?? lead.bd?.team?.salesHead?.name ?? null

  // Room rent for selected room: from preAuth roomRent or lookup requestedRoomType in roomTypes
  const selectedRoomRent =
    preAuth?.requestedRoomType && preAuth?.roomTypes?.length
      ? preAuth.roomTypes.find((r) => r.name === preAuth.requestedRoomType)?.rent ?? preAuth.roomRent
      : preAuth?.roomRent

  // Split implantConsumables into Implants and Consumables lines
  const implantConsumablesStr = rec.implantConsumables || ''
  const implantLine = implantConsumablesStr.split('\n').find((l) => l.trim().toLowerCase().startsWith('implants:'))
  const consumablesLine = implantConsumablesStr.split('\n').find((l) => l.trim().toLowerCase().startsWith('consumables:'))

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header - hidden in print */}
      <div className="print:hidden border-b border-teal-200 bg-teal-50/50 p-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">IPD Admission Details</h1>
          <p className="text-slate-600">
            {lead.leadRef} - {lead.patientName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4 mr-1" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="hidden print:block mb-6 print:break-after-avoid">
          <h1 className="text-2xl font-bold mb-2 text-teal-700">IPD Admission Details</h1>
          <p className="text-sm text-slate-600">
            {lead.leadRef} - {lead.patientName}
          </p>
        </div>

        {/* 1. Patient details: name, age, sex, leadId */}
        <div className="mb-6 p-4 rounded-lg bg-slate-50/80 print:bg-white print:break-inside-avoid border-l-4 border-teal-500">
          <h2 className="text-lg font-semibold mb-3 text-teal-700 border-b border-teal-200 pb-2">Patient Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Patient Name</p>
              <p className="text-base">{lead.patientName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Lead ID / Reference</p>
              <p className="text-base">{lead.leadRef}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Age</p>
              <p className="text-base">{lead.age != null ? lead.age : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Sex</p>
              <p className="text-base">{lead.sex ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* 2. Date and time of admission and surgery */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50/80 print:bg-white print:break-inside-avoid border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold mb-3 text-blue-700 border-b border-blue-200 pb-2">Admission & Surgery</h2>
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
              <p className="text-sm font-semibold text-gray-600">Surgery Date</p>
              <p className="text-base">{formatDate(rec.surgeryDate)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">OT Time</p>
              <p className="text-base">{rec.surgeryTime || '-'}</p>
            </div>
          </div>
        </div>

        {/* 3. Treatment / surgery */}
        <div className="mb-6 p-4 rounded-lg bg-violet-50/80 print:bg-white print:break-inside-avoid border-l-4 border-violet-500">
          <h2 className="text-lg font-semibold mb-3 text-violet-700 border-b border-violet-200 pb-2">Treatment / Surgery</h2>
          <p className="text-base">{lead.treatment ?? '-'}</p>
        </div>

        {/* 4. Surgeon (IPD doctor name) */}
        <div className="mb-6 p-4 rounded-lg bg-amber-50/80 print:bg-white print:break-inside-avoid border-l-4 border-amber-500">
          <h2 className="text-lg font-semibold mb-3 text-amber-800 border-b border-amber-200 pb-2">Surgeon</h2>
          <p className="text-base">{lead.ipdDrName ?? '-'}</p>
        </div>

        {/* 5. Hospital name, address, Google Map link */}
        <div className="mb-6 p-4 rounded-lg bg-emerald-50/80 print:bg-white print:break-inside-avoid border-l-4 border-emerald-500">
          <h2 className="text-lg font-semibold mb-3 text-emerald-700 border-b border-emerald-200 pb-2">Hospital</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold text-gray-600">Hospital Name</p>
              <p className="text-base">{rec.admittingHospital || lead.hospitalName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Address</p>
              <p className="text-base">{rec.hospitalAddress || '-'}</p>
            </div>
            {rec.googleMapLocation && (
              <div>
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
        </div>

        {/* 6. Type of insurance, name of insurance */}
        <div className="mb-6 p-4 rounded-lg bg-sky-50/80 print:bg-white print:break-inside-avoid border-l-4 border-sky-500">
          <h2 className="text-lg font-semibold mb-3 text-sky-700 border-b border-sky-200 pb-2">Insurance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Type of Insurance</p>
              <p className="text-base">
                {lead.kypSubmission?.insuranceType != null
                  ? String(lead.kypSubmission.insuranceType).replace(/_/g, ' ')
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Name of Insurance</p>
              <p className="text-base">{lead.insuranceName ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* 7. TPA, sum insured, balance insured */}
        <div className="mb-6 p-4 rounded-lg bg-indigo-50/80 print:bg-white print:break-inside-avoid border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold mb-3 text-indigo-700 border-b border-indigo-200 pb-2">TPA & Coverage</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">TPA</p>
              <p className="text-base">{rec.tpa ?? preAuth?.tpa ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Sum Insured</p>
              <p className="text-base">{preAuth?.sumInsured ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Balance Insured</p>
              <p className="text-base">{preAuth?.balanceInsured ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* 8. Copay, disease capping, room rent (selected room from pre-auth) */}
        <div className="mb-6 p-4 rounded-lg bg-green-50/80 print:bg-white print:break-inside-avoid border-l-4 border-green-500">
          <h2 className="text-lg font-semibold mb-3 text-green-700 border-b border-green-200 pb-2">Pre-Auth Financials</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">Copay</p>
              <p className="text-base">{preAuth?.copay != null ? `${preAuth.copay}%` : '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Disease Capping</p>
              <p className="text-base">
                {preAuth?.capping != null && preAuth.capping !== ''
                  ? (typeof preAuth.capping === 'string' && !Number.isNaN(Number(preAuth.capping))
                      ? fmtCurr(Number(preAuth.capping))
                      : preAuth.capping) ?? '-'
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Room Type (Pre-Auth)</p>
              <p className="text-base">{preAuth?.requestedRoomType ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Room Rent</p>
              <p className="text-base">{selectedRoomRent ?? preAuth?.roomRent ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* 9. Instruments with amount */}
        {(rec.instrument?.trim() ?? '') && (
          <div className="mb-6 p-4 rounded-lg bg-orange-50/80 print:bg-white print:break-inside-avoid border-l-4 border-orange-500">
            <h2 className="text-lg font-semibold mb-3 text-orange-700 border-b border-orange-200 pb-2">Instruments</h2>
            <p className="text-sm whitespace-pre-line">{rec.instrument}</p>
          </div>
        )}

        {/* 10. Implants with amounts */}
        {implantLine && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50/80 print:bg-white print:break-inside-avoid border-l-4 border-rose-500">
            <h2 className="text-lg font-semibold mb-3 text-rose-700 border-b border-rose-200 pb-2">Implants</h2>
            <p className="text-sm whitespace-pre-line">{implantLine}</p>
          </div>
        )}

        {/* 11. Consumables with amounts */}
        {consumablesLine && (
          <div className="mb-6 p-4 rounded-lg bg-pink-50/80 print:bg-white print:break-inside-avoid border-l-4 border-pink-500">
            <h2 className="text-lg font-semibold mb-3 text-pink-700 border-b border-pink-200 pb-2">Consumables</h2>
            <p className="text-sm whitespace-pre-line">{consumablesLine}</p>
          </div>
        )}

        {/* 12. BD and BD Manager name */}
        <div className="mb-6 p-4 rounded-lg bg-cyan-50/80 print:bg-white print:break-inside-avoid border-l-4 border-cyan-500">
          <h2 className="text-lg font-semibold mb-3 text-cyan-700 border-b border-cyan-200 pb-2">BD & Manager</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-600">BD Name</p>
              <p className="text-base">{lead.bd?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">BD Manager</p>
              <p className="text-base">{bdManagerName ?? '-'}</p>
            </div>
          </div>
        </div>

        {/* Optional: IPD Status, Notes */}
        {rec.ipdStatus && (
          <div className="mb-6 p-4 rounded-lg bg-slate-100 print:bg-white print:break-inside-avoid border-l-4 border-slate-400">
            <h3 className="font-semibold mb-2 text-slate-700">IPD Status</h3>
            <p className="text-base font-semibold text-gray-700">{getIpdStatusLabel(rec.ipdStatus)}</p>
            {rec.ipdStatusUpdatedAt && (
              <p className="text-sm text-gray-600 mt-1">
                Updated {format(new Date(rec.ipdStatusUpdatedAt), 'dd MMM yyyy, HH:mm')}
              </p>
            )}
          </div>
        )}
        {rec.notes?.trim() && (
          <div className="mb-6 p-4 rounded-lg bg-slate-50/80 print:bg-white print:break-inside-avoid border-l-4 border-slate-400">
            <h2 className="text-lg font-semibold mb-3 text-slate-700 border-b border-slate-200 pb-2">Additional Notes</h2>
            <p className="text-sm whitespace-pre-line">{rec.notes}</p>
          </div>
        )}
      </div>

      <div className="print:hidden border-t p-4 text-center">
        <Button size="lg" onClick={() => window.print()}>
          <PrinterIcon className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>
    </div>
  )
}
