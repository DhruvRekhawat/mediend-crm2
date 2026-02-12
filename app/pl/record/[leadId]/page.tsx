'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPatch } from '@/lib/api-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState, useEffect, useRef } from 'react'

interface Lead {
  id: string
  leadRef?: string
  patientName?: string
  phoneNumber?: string
  hospitalName?: string
  treatment?: string
  category?: string
  circle?: string
  source?: string
  billAmount?: number
  surgeryDate?: string | Date
  bd?: { name?: string }
  plRecord?: Record<string, unknown> & {
    finalProfit?: number
    hospitalPayoutStatus?: string
    doctorPayoutStatus?: string
    mediendInvoiceStatus?: string
  }
  [key: string]: unknown
}

function getMonthFromDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export default function PLRecordEditPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const leadId = params.leadId as string

  const { data: record, isLoading: loadingLead } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
  })

  const [formData, setFormData] = useState({
    month: '',
    surgeryDate: '',
    managerRole: '',
    managerName: '',
    bdmName: '',
    paymentType: '',
    status: '',
    approvedOrCash: '',
    paymentCollectedAt: '',
    totalAmount: '',
    billAmount: '',
    cashPaidByPatient: '',
    cashOrDedPaid: '',
    referralAmount: '',
    cabCharges: '',
    dcCharges: '',
    doctorCharges: '',
    implantCost: '',
    hospitalSharePct: '',
    hospitalShareAmount: '',
    mediendSharePct: '',
    mediendShareAmount: '',
    mediendNetProfit: '',
    remarks: '',
    hospitalPayoutStatus: 'PENDING',
    doctorPayoutStatus: 'PENDING',
    mediendInvoiceStatus: 'PENDING',
  })

  const initialized = useRef(false)
  useEffect(() => {
    if (!record || initialized.current) return
    const pl = record.plRecord as Record<string, unknown> | undefined
    const surgeryDate = record.surgeryDate || (pl?.surgeryDate as string | Date | null | undefined)
    const monthFromSurgery = getMonthFromDate(surgeryDate)
    const monthValue = (pl?.month ? new Date(pl.month as string).toISOString().slice(0, 10) : null) || monthFromSurgery
    setFormData({
      month: monthValue ? monthValue.slice(0, 7) : '',
      surgeryDate: surgeryDate ? new Date(surgeryDate as string).toISOString().slice(0, 10) : '',
      managerRole: (pl?.managerRole as string) || '',
      managerName: (pl?.managerName as string) || '',
      bdmName: (pl?.bdmName as string) || record.bd?.name || '',
      paymentType: (pl?.paymentType as string) || '',
      status: (pl?.status as string) || '',
      approvedOrCash: (pl?.approvedOrCash as string) ?? '',
      paymentCollectedAt: (pl?.paymentCollectedAt as string) || '',
      totalAmount: pl?.totalAmount != null ? String(pl.totalAmount) : '',
      billAmount: pl?.billAmount != null ? String(pl.billAmount) : (record.billAmount != null ? String(record.billAmount) : ''),
      cashPaidByPatient: pl?.cashPaidByPatient != null ? String(pl.cashPaidByPatient) : '',
      cashOrDedPaid: pl?.cashOrDedPaid != null ? String(pl.cashOrDedPaid) : '',
      referralAmount: pl?.referralAmount != null ? String(pl.referralAmount) : '',
      cabCharges: pl?.cabCharges != null ? String(pl.cabCharges) : '',
      dcCharges: pl?.dcCharges != null ? String(pl.dcCharges) : '',
      doctorCharges: pl?.doctorCharges != null ? String(pl.doctorCharges) : '',
      implantCost: pl?.implantCost != null ? String(pl.implantCost) : '',
      hospitalSharePct: pl?.hospitalSharePct != null ? String(pl.hospitalSharePct) : '',
      hospitalShareAmount: pl?.hospitalShareAmount != null ? String(pl.hospitalShareAmount) : '',
      mediendSharePct: pl?.mediendSharePct != null ? String(pl.mediendSharePct) : '',
      mediendShareAmount: pl?.mediendShareAmount != null ? String(pl.mediendShareAmount) : '',
      mediendNetProfit: pl?.mediendNetProfit != null ? String(pl.mediendNetProfit) : (record.plRecord?.finalProfit != null ? String(record.plRecord.finalProfit) : (record.netProfit != null ? String(record.netProfit) : '')),
      remarks: (pl?.remarks as string) || '',
      hospitalPayoutStatus: record.plRecord?.hospitalPayoutStatus || 'PENDING',
      doctorPayoutStatus: record.plRecord?.doctorPayoutStatus || 'PENDING',
      mediendInvoiceStatus: record.plRecord?.mediendInvoiceStatus || 'PENDING',
    })
    initialized.current = true
  }, [record])

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return apiPatch<Lead>(`/api/leads/${leadId}`, { plRecord: payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['pl'] })
      toast.success('P/L record saved')
      router.push('/pl/dashboard')
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to save')
    },
  })

  const update = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const bill = parseFloat(formData.billAmount) || 0
    const hospPct = parseFloat(formData.hospitalSharePct) || 0
    const medPct = parseFloat(formData.mediendSharePct) || 0
    const hospAmount = bill > 0 && hospPct > 0 ? (bill * hospPct) / 100 : parseFloat(formData.hospitalShareAmount) || 0
    const medAmount = bill > 0 && medPct > 0 ? (bill * medPct) / 100 : parseFloat(formData.mediendShareAmount) || 0
    const costs = (parseFloat(formData.referralAmount) || 0) + (parseFloat(formData.cabCharges) || 0) + (parseFloat(formData.dcCharges) || 0) + (parseFloat(formData.doctorCharges) || 0) + (parseFloat(formData.implantCost) || 0)
    const netProfit = medAmount - costs
    const mediendNet = parseFloat(formData.mediendNetProfit) || netProfit

    const payload: Record<string, unknown> = {
      month: formData.month ? new Date(`${formData.month}-01`).toISOString() : undefined,
      surgeryDate: formData.surgeryDate ? new Date(formData.surgeryDate).toISOString() : undefined,
      managerRole: formData.managerRole || undefined,
      managerName: formData.managerName || undefined,
      bdmName: formData.bdmName || undefined,
      paymentType: formData.paymentType || undefined,
      status: formData.status || undefined,
      approvedOrCash: formData.approvedOrCash || undefined,
      paymentCollectedAt: formData.paymentCollectedAt || undefined,
      totalAmount: parseFloat(formData.totalAmount) || 0,
      billAmount: parseFloat(formData.billAmount) || 0,
      cashPaidByPatient: parseFloat(formData.cashPaidByPatient) || 0,
      cashOrDedPaid: parseFloat(formData.cashOrDedPaid) || 0,
      referralAmount: parseFloat(formData.referralAmount) || 0,
      cabCharges: parseFloat(formData.cabCharges) || 0,
      dcCharges: parseFloat(formData.dcCharges) || 0,
      doctorCharges: parseFloat(formData.doctorCharges) || 0,
      implantCost: parseFloat(formData.implantCost) || 0,
      hospitalSharePct: parseFloat(formData.hospitalSharePct) || undefined,
      hospitalShareAmount: hospAmount,
      mediendSharePct: parseFloat(formData.mediendSharePct) || undefined,
      mediendShareAmount: medAmount,
      mediendNetProfit: mediendNet,
      finalProfit: mediendNet,
      remarks: formData.remarks || undefined,
      hospitalPayoutStatus: formData.hospitalPayoutStatus,
      doctorPayoutStatus: formData.doctorPayoutStatus,
      mediendInvoiceStatus: formData.mediendInvoiceStatus,
      closedAt: formData.hospitalPayoutStatus === 'PAID' && formData.doctorPayoutStatus === 'PAID' ? new Date().toISOString() : undefined,
    }
    updateMutation.mutate(payload)
  }

  if (loadingLead || !record) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/pl/dashboard">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <nav className="text-sm text-muted-foreground">
                <Link href="/pl/dashboard" className="hover:text-foreground">P/L Dashboard</Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">Edit P/L — {record.leadRef ?? record.id}</span>
              </nav>
              <h1 className="text-2xl font-bold mt-0.5">Edit P/L Record</h1>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Case context</CardTitle>
                <CardDescription>Patient and case details (from lead)</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/patient/${leadId}`}>View patient</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Lead Ref</Label>
                <p className="font-medium">{record.leadRef ?? '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Patient</Label>
                <p className="font-medium">{record.patientName ?? '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hospital</Label>
                <p className="font-medium">{record.hospitalName ?? '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Treatment</Label>
                <p className="font-medium">{record.treatment ?? '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Surgery date</Label>
                <p className="font-medium">
                  {record.surgeryDate ? new Date(record.surgeryDate as string).toLocaleDateString() : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reporting & people</CardTitle>
                <CardDescription>Month is prefilled from surgery date when available</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Reporting month</Label>
                  <Input
                    type="month"
                    value={formData.month}
                    onChange={(e) => update('month', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Surgery date</Label>
                  <Input
                    type="date"
                    value={formData.surgeryDate}
                    onChange={(e) => update('surgeryDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Manager role</Label>
                  <Input
                    value={formData.managerRole}
                    onChange={(e) => update('managerRole', e.target.value)}
                    placeholder="ATL / TL / ACM / CM / SCM"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Manager name</Label>
                  <Input value={formData.managerName} onChange={(e) => update('managerName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>BDM name</Label>
                  <Input value={formData.bdmName} onChange={(e) => update('bdmName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Payment type</Label>
                  <Input value={formData.paymentType} onChange={(e) => update('paymentType', e.target.value)} placeholder="e.g. Cashless" className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={formData.status} onChange={(e) => update('status', e.target.value)} placeholder="e.g. IPD Done" className="mt-1" />
                </div>
                <div>
                  <Label>Approved / Cash</Label>
                  <Input value={formData.approvedOrCash} onChange={(e) => update('approvedOrCash', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Payment collected at</Label>
                  <Input value={formData.paymentCollectedAt} onChange={(e) => update('paymentCollectedAt', e.target.value)} placeholder="e.g. Collected By Hospital" className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amounts</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'totalAmount', label: 'Total amount' },
                  { key: 'billAmount', label: 'Bill amount' },
                  { key: 'cashPaidByPatient', label: 'Cash paid by patient' },
                  { key: 'cashOrDedPaid', label: 'Cash / Ded paid' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input type="number" step="0.01" value={formData[key as keyof typeof formData]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost breakdown</CardTitle>
                <CardDescription>Referral, cab, D&C, doctor charges, implant</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { key: 'referralAmount', label: 'Referral amount' },
                  { key: 'cabCharges', label: 'Cab charges' },
                  { key: 'dcCharges', label: 'D&C charges' },
                  { key: 'doctorCharges', label: 'Doctor charges' },
                  { key: 'implantCost', label: 'Implant cost' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Input type="number" step="0.01" value={formData[key as keyof typeof formData]} onChange={(e) => update(key, e.target.value)} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue split</CardTitle>
                <CardDescription>Hospital and Mediend share; net profit</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>Hospital share %</Label>
                  <Input type="number" step="0.01" value={formData.hospitalSharePct} onChange={(e) => update('hospitalSharePct', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Hospital share amount</Label>
                  <Input type="number" step="0.01" value={formData.hospitalShareAmount} onChange={(e) => update('hospitalShareAmount', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Mediend share %</Label>
                  <Input type="number" step="0.01" value={formData.mediendSharePct} onChange={(e) => update('mediendSharePct', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Mediend share amount</Label>
                  <Input type="number" step="0.01" value={formData.mediendShareAmount} onChange={(e) => update('mediendShareAmount', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Mediend net profit</Label>
                  <Input type="number" step="0.01" value={formData.mediendNetProfit} onChange={(e) => update('mediendNetProfit', e.target.value)} className="mt-1 font-medium" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Remarks</Label>
                  <Input value={formData.remarks} onChange={(e) => update('remarks', e.target.value)} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save P/L record
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/pl/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  )
}
