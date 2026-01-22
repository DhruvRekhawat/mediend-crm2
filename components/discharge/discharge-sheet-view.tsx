'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { useState } from 'react'

interface DischargeSheetViewProps {
  dischargeSheet: any
}

export function DischargeSheetView({ dischargeSheet }: DischargeSheetViewProps) {
  const [creatingPNL, setCreatingPNL] = useState(false)

  const handleCreatePNL = async () => {
    if (!confirm('Create PNL record from this discharge sheet?')) {
      return
    }

    setCreatingPNL(true)
    try {
      await apiPost(`/api/discharge-sheet/${dischargeSheet.id}/create-pnl`, {})
      toast.success('PNL record created successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create PNL record')
    } finally {
      setCreatingPNL(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Core Identification */}
      <Card>
        <CardHeader>
          <CardTitle>Core Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dischargeSheet.month && (
            <div>
              <Label>Reporting Month</Label>
              <p className="text-sm font-medium mt-1">
                {format(new Date(dischargeSheet.month), 'MMMM yyyy')}
              </p>
            </div>
          )}
          {dischargeSheet.dischargeDate && (
            <div>
              <Label>Discharge Date</Label>
              <p className="text-sm font-medium mt-1">
                {format(new Date(dischargeSheet.dischargeDate), 'PP')}
              </p>
            </div>
          )}
          {dischargeSheet.surgeryDate && (
            <div>
              <Label>Surgery Date</Label>
              <p className="text-sm font-medium mt-1">
                {format(new Date(dischargeSheet.surgeryDate), 'PP')}
              </p>
            </div>
          )}
          {dischargeSheet.status && (
            <div>
              <Label>Status</Label>
              <Badge className="mt-1">{dischargeSheet.status}</Badge>
            </div>
          )}
          {dischargeSheet.paymentType && (
            <div>
              <Label>Payment Type</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.paymentType}</p>
            </div>
          )}
          {dischargeSheet.approvedOrCash && (
            <div>
              <Label>Approved / Cash</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.approvedOrCash}</p>
            </div>
          )}
          {dischargeSheet.paymentCollectedAt && (
            <div>
              <Label>Payment Collected At</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.paymentCollectedAt}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* People & Ownership */}
      <Card>
        <CardHeader>
          <CardTitle>People & Ownership</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dischargeSheet.managerRole && (
            <div>
              <Label>Manager Role</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.managerRole}</p>
            </div>
          )}
          {dischargeSheet.managerName && (
            <div>
              <Label>Manager Name</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.managerName}</p>
            </div>
          )}
          {dischargeSheet.bdmName && (
            <div>
              <Label>BDM Name</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.bdmName}</p>
            </div>
          )}
          {dischargeSheet.patientName && (
            <div>
              <Label>Patient Name</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.patientName}</p>
            </div>
          )}
          {dischargeSheet.patientPhone && (
            <div>
              <Label>Patient Phone</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.patientPhone}</p>
            </div>
          )}
          {dischargeSheet.doctorName && (
            <div>
              <Label>Doctor Name</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.doctorName}</p>
            </div>
          )}
          {dischargeSheet.hospitalName && (
            <div>
              <Label>Hospital Name</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.hospitalName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financials */}
      <Card>
        <CardHeader>
          <CardTitle>Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Total Amount</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.totalAmount?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Bill Amount</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.billAmount?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Cash Paid by Patient</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.cashPaidByPatient?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Cash / Ded Paid</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.cashOrDedPaid?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Referral Amount</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.referralAmount?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Cab Charges</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.cabCharges?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Implant Cost</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.implantCost?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>D&C Charges</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.dcCharges?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Doctor Charges</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.doctorCharges?.toLocaleString() || '0'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Split */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Split</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dischargeSheet.hospitalSharePct !== null && (
            <div>
              <Label>Hospital Share %</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.hospitalSharePct}%</p>
            </div>
          )}
          <div>
            <Label>Hospital Share Amount</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.hospitalShareAmount?.toLocaleString() || '0'}</p>
          </div>
          {dischargeSheet.mediendSharePct !== null && (
            <div>
              <Label>Mediend Share %</Label>
              <p className="text-sm font-medium mt-1">{dischargeSheet.mediendSharePct}%</p>
            </div>
          )}
          <div>
            <Label>Mediend Share Amount</Label>
            <p className="text-sm font-medium mt-1">₹{dischargeSheet.mediendShareAmount?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <Label>Mediend Net Profit</Label>
            <p className="text-sm font-medium mt-1 text-green-600">
              ₹{dischargeSheet.mediendNetProfit?.toLocaleString() || '0'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      {dischargeSheet.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{dischargeSheet.remarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!dischargeSheet.plRecord && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Create PNL record from this discharge sheet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreatePNL} disabled={creatingPNL}>
              {creatingPNL ? 'Creating...' : 'Create PNL Record'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
