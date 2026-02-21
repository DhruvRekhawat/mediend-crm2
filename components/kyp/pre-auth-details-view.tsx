'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { File, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CaseStage, PreAuthStatus } from '@prisma/client'

interface SuggestedHospital {
  id: string
  hospitalName: string
  tentativeBill?: number | null
  roomRentGeneral?: number | null
  roomRentSingle?: number | null
  roomRentDeluxe?: number | null
  roomRentSemiPrivate?: number | null
  notes?: string | null
}

interface PreAuthDetailsViewProps {
  preAuthData: {
    id: string
    sumInsured?: string | null
    roomRent?: string | null
    capping?: string | null
    copay?: string | null
    icu?: string | null
    hospitalNameSuggestion?: string | null
    hospitalSuggestions?: string[] | null
    suggestedHospitals?: SuggestedHospital[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    insurance?: string | null
    tpa?: string | null
    requestedHospitalName?: string | null
    requestedRoomType?: string | null
    diseaseDescription?: string | null
    diseaseImages?: Array<{ name: string; url: string }> | null
    preAuthRaisedAt?: string | null
    handledAt?: string | null
    handledBy?: {
      id: string
      name: string
    } | null
    preAuthRaisedBy?: {
      id: string
      name: string
    } | null
    approvalStatus?: PreAuthStatus
    rejectionReason?: string | null
  }
  caseStage: CaseStage
  leadRef?: string
  patientName?: string
}

export function PreAuthDetailsView({ 
  preAuthData, 
  caseStage,
  leadRef,
  patientName 
}: PreAuthDetailsViewProps) {
  // Prefer Insurance's suggested hospitals (with details); fallback to legacy JSON
  const suggestedList = Array.isArray(preAuthData.suggestedHospitals) && preAuthData.suggestedHospitals.length > 0
    ? preAuthData.suggestedHospitals
    : null
  const legacyHospitals = Array.isArray(preAuthData.hospitalSuggestions)
    ? preAuthData.hospitalSuggestions.filter(Boolean)
    : preAuthData.hospitalNameSuggestion
      ? [preAuthData.hospitalNameSuggestion]
      : []
  const hasSuggestedHospitals = suggestedList && suggestedList.length > 0
  const hasLegacyHospitals = legacyHospitals.length > 0

  const roomTypes = Array.isArray(preAuthData.roomTypes)
    ? preAuthData.roomTypes.filter((r) => r.name && r.name.trim())
    : []

  const diseaseImages = Array.isArray(preAuthData.diseaseImages)
    ? preAuthData.diseaseImages
    : []

  const hasInsuranceData = !!(
    preAuthData.sumInsured ||
    preAuthData.roomRent ||
    preAuthData.capping ||
    preAuthData.copay ||
    preAuthData.icu ||
    preAuthData.insurance ||
    preAuthData.tpa ||
    hasSuggestedHospitals ||
    hasLegacyHospitals ||
    roomTypes.length > 0
  )

  const hasBDRequest = !!(
    preAuthData.requestedHospitalName ||
    preAuthData.requestedRoomType ||
    preAuthData.diseaseDescription ||
    diseaseImages.length > 0
  )

  return (
    <div className="space-y-6">
      {/* Patient Information */}
      {(leadRef || patientName) && (
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {leadRef && (
                <div>
                  <Label>Lead Reference</Label>
                  <p className="text-sm font-medium">{leadRef}</p>
                </div>
              )}
              {patientName && (
                <div>
                  <Label>Patient Name</Label>
                  <p className="text-sm font-medium">{patientName}</p>
                </div>
              )}
              <div>
                <Label>Case Stage</Label>
                <Badge variant="secondary" className="mt-1">
                  {caseStage.replace(/_/g, ' ')}
                </Badge>
              </div>
              {preAuthData.approvalStatus && (
                <div>
                  <Label>Approval Status</Label>
                  <div className="mt-1">
                    {preAuthData.approvalStatus === PreAuthStatus.APPROVED ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : preAuthData.approvalStatus === PreAuthStatus.REJECTED ? (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            {preAuthData.approvalStatus === PreAuthStatus.REJECTED && preAuthData.rejectionReason && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                <Label className="text-red-900 dark:text-red-100">Rejection Reason</Label>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{preAuthData.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Insurance-Added Details */}
      {hasInsuranceData && (
        <Card>
          <CardHeader>
            <CardTitle>Insurance Details</CardTitle>
            <CardDescription>Policy and coverage information added by Insurance team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sum Insured</Label>
                <p className="text-sm font-medium">{preAuthData.sumInsured || '-'}</p>
              </div>
              <div>
                <Label>Room Rent</Label>
                <p className="text-sm font-medium">{preAuthData.roomRent || '-'}</p>
              </div>
              <div>
                <Label>Capping</Label>
                <p className="text-sm font-medium">{preAuthData.capping || '-'}</p>
              </div>
              <div>
                <Label>Copay</Label>
                <p className="text-sm font-medium">{preAuthData.copay || '-'}</p>
              </div>
              <div>
                <Label>ICU</Label>
                <p className="text-sm font-medium">{preAuthData.icu || '-'}</p>
              </div>
              <div>
                <Label>Insurance Company</Label>
                <p className="text-sm font-medium">{preAuthData.insurance || '-'}</p>
              </div>
              <div>
                <Label>TPA</Label>
                <p className="text-sm font-medium">{preAuthData.tpa || '-'}</p>
              </div>
              {preAuthData.handledAt && (
                <div>
                  <Label>Handled At</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(preAuthData.handledAt), 'PPpp')}
                  </p>
                </div>
              )}
              {preAuthData.handledBy && (
                <div>
                  <Label>Handled By</Label>
                  <p className="text-sm font-medium">{preAuthData.handledBy.name}</p>
                </div>
              )}
            </div>

            {(hasSuggestedHospitals || hasLegacyHospitals) && (
              <div className="mt-4">
                <Label>Suggested Hospitals (by Insurance)</Label>
                {hasSuggestedHospitals ? (
                  <ul className="mt-2 space-y-3">
                    {suggestedList!.map((h) => (
                      <li key={h.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{h.hospitalName}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
                          {h.tentativeBill != null && <span>Tentative bill: ₹{h.tentativeBill.toLocaleString()}</span>}
                          {h.roomRentGeneral != null && <span>General: ₹{h.roomRentGeneral.toLocaleString()}</span>}
                          {h.roomRentSingle != null && <span>Single: ₹{h.roomRentSingle.toLocaleString()}</span>}
                          {h.roomRentDeluxe != null && <span>Deluxe: ₹{h.roomRentDeluxe.toLocaleString()}</span>}
                          {h.roomRentSemiPrivate != null && <span>Semi-Private: ₹{h.roomRentSemiPrivate.toLocaleString()}</span>}
                        </div>
                        {h.notes?.trim() && <p className="mt-1 text-muted-foreground">{h.notes}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    {legacyHospitals.map((hospital, index) => (
                      <li key={index} className="font-medium">{hospital}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {roomTypes.length > 0 && (
              <div className="mt-4">
                <Label>Room Types</Label>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  {roomTypes.map((room, index) => (
                    <li key={index} className="font-medium">
                      {room.name} {room.rent ? `– ₹${room.rent}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BD Pre-Auth Request */}
      {hasBDRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Pre-Auth Request</CardTitle>
            <CardDescription>Hospital and room selection by BD team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {preAuthData.requestedHospitalName && (
                <div>
                  <Label>Requested Hospital</Label>
                  <p className="text-sm font-medium">{preAuthData.requestedHospitalName}</p>
                </div>
              )}
              {preAuthData.requestedRoomType && (
                <div>
                  <Label>Requested Room Type</Label>
                  <p className="text-sm font-medium">{preAuthData.requestedRoomType}</p>
                </div>
              )}
              {preAuthData.preAuthRaisedAt && (
                <div>
                  <Label>Pre-Auth Raised At</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(preAuthData.preAuthRaisedAt), 'PPpp')}
                  </p>
                </div>
              )}
              {preAuthData.preAuthRaisedBy && (
                <div>
                  <Label>Raised By</Label>
                  <p className="text-sm font-medium">{preAuthData.preAuthRaisedBy.name}</p>
                </div>
              )}
              {preAuthData.diseaseDescription && (
                <div className="col-span-2">
                  <Label>Disease Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {preAuthData.diseaseDescription}
                  </p>
                </div>
              )}
            </div>

            {diseaseImages.length > 0 && (
              <div className="mt-4">
                <Label>Disease Images</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {diseaseImages.map((image, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{image.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(image.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no data */}
      {!hasInsuranceData && !hasBDRequest && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pre-authorization details available yet
          </CardContent>
        </Card>
      )}
    </div>
  )
}
