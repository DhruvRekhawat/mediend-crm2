import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { User, Stethoscope, Building2, Shield, Calendar, Package, MapPin, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface IPDDetailsCardProps {
  admissionRecord: any
}

export function IPDDetailsCard({ admissionRecord }: IPDDetailsCardProps) {
  if (!admissionRecord) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(new Date(dateStr), 'dd MMM yyyy')
    } catch (e) {
      return dateStr
    }
  }

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <CardTitle>IPD Admission Details</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Admission & Surgery */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Admission & Surgery
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {admissionRecord.ipdStatus && (
                <div className="pb-2 border-b border-gray-200 dark:border-gray-700">
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">IPD Status</Label>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{admissionRecord.ipdStatus.replace(/_/g, ' ')}</p>
                  {admissionRecord.ipdStatusUpdatedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">Updated {format(new Date(admissionRecord.ipdStatusUpdatedAt), 'dd MMM yyyy, HH:mm')}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Admission Date</Label>
                  <p className="text-sm font-semibold">{formatDate(admissionRecord.admissionDate)}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Time</Label>
                  <p className="text-sm font-semibold">{admissionRecord.admissionTime || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">
                    {admissionRecord.ipdStatus === 'POSTPONED' && admissionRecord.newSurgeryDate ? 'Original surgery date' : 'Surgery Date'}
                  </Label>
                  <p className="text-sm font-semibold">{formatDate(admissionRecord.surgeryDate)}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Time</Label>
                  <p className="text-sm font-semibold">{admissionRecord.surgeryTime || '-'}</p>
                </div>
              </div>
              {admissionRecord.ipdStatus === 'POSTPONED' && admissionRecord.newSurgeryDate && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">New surgery date</Label>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatDate(admissionRecord.newSurgeryDate)}</p>
                </div>
              )}
              {admissionRecord.ipdStatus === 'DISCHARGED' && admissionRecord.ipdDischargeDate && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Discharge date</Label>
                  <p className="text-sm font-semibold">{formatDate(admissionRecord.ipdDischargeDate)}</p>
                </div>
              )}
              {admissionRecord.ipdStatusReason && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Reason</Label>
                  <p className="text-sm text-muted-foreground">{admissionRecord.ipdStatusReason}</p>
                </div>
              )}
              {admissionRecord.ipdStatusNotes && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Status notes</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{admissionRecord.ipdStatusNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hospital Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              Hospital Details
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">Admitting Hospital</Label>
                <p className="text-sm font-semibold">{admissionRecord.admittingHospital || '-'}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">Address</Label>
                <p className="text-sm font-semibold line-clamp-2" title={admissionRecord.hospitalAddress}>{admissionRecord.hospitalAddress || '-'}</p>
              </div>
              {admissionRecord.googleMapLocation && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Location</Label>
                  <div className="mt-1">
                    <a 
                      href={admissionRecord.googleMapLocation} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> View on Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Medical & Insurance */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 border-b pb-2">
              <Shield className="w-4 h-4 text-green-600" />
              Medical & Insurance
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-[10px] uppercase text-gray-500 font-bold">TPA</Label>
                <p className="text-sm font-semibold">{admissionRecord.tpa || '-'}</p>
              </div>
              {(admissionRecord.implantConsumables || admissionRecord.instrument) && (
                <div className="space-y-2">
                   {admissionRecord.implantConsumables && (
                     <div>
                       <Label className="text-[10px] uppercase text-gray-500 font-bold">Implants/Consumables</Label>
                       <p className="text-sm whitespace-pre-line">{admissionRecord.implantConsumables}</p>
                     </div>
                   )}
                   {admissionRecord.instrument && (
                     <div>
                       <Label className="text-[10px] uppercase text-gray-500 font-bold">Instruments</Label>
                       <p className="text-sm whitespace-pre-line">{admissionRecord.instrument}</p>
                     </div>
                   )}
                </div>
              )}
              {admissionRecord.notes && (
                <div>
                  <Label className="text-[10px] uppercase text-gray-500 font-bold">Notes</Label>
                  <p className="text-sm italic text-muted-foreground">{admissionRecord.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
