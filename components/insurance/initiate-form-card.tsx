import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { FileText, ExternalLink, Shield, Building2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InitiateFormCardProps {
  initiateForm: any
}

export function InitiateFormCard({ initiateForm }: InitiateFormCardProps) {
  if (!initiateForm) return null

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <CardTitle>Insurance Initiate Form</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Receipt className="w-4 h-4 text-green-600" />
              Financial Details
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Total Bill</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.totalBillAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Discount</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.discount || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Other Reductions</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.otherReductions || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Deductible</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.deductible || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Co-pay</Label>
                  <p className="text-sm font-semibold">{initiateForm.copay ? `${initiateForm.copay}%` : '0%'}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Co-pay Buffer</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.copayBuffer || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Authorization & Policy */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Authorization & Policy
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">Total Authorized</Label>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">₹{Number(initiateForm.totalAuthorizedAmount || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">To Be Paid By Insurance</Label>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{Number(initiateForm.amountToBePaidByInsurance || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Policy Deductible</Label>
                  <p className="text-sm font-semibold">₹{Number(initiateForm.policyDeductibleAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Exceeds Limit</Label>
                  <p className="text-sm font-semibold">{initiateForm.exceedsPolicyLimit || 'No'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              Additional Info
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">Room Category</Label>
                <p className="text-sm font-semibold">{initiateForm.roomCategory || '-'}</p>
              </div>
              {initiateForm.initialApprovalByHospitalUrl && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Initial Approval Letter</Label>
                  <div className="mt-1">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <a href={initiateForm.initialApprovalByHospitalUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" /> View Document
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              {initiateForm.createdBy && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Created by {initiateForm.createdBy.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
