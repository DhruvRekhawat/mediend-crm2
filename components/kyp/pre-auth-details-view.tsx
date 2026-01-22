'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { File, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CaseStage } from '@prisma/client'

interface PreAuthDetailsViewProps {
  preAuthData: {
    id: string
    sumInsured: string | null
    roomRent: string | null
    capping: string | null
    copay: string | null
    icu: string | null
    hospitalNameSuggestion: string | null
    hospitalSuggestions?: string[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    insurance: string | null
    tpa: string | null
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
  const hospitals = Array.isArray(preAuthData.hospitalSuggestions)
    ? preAuthData.hospitalSuggestions.filter(Boolean)
    : preAuthData.hospitalNameSuggestion
      ? [preAuthData.hospitalNameSuggestion]
      : []

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
    hospitals.length > 0 ||
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
            </div>
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

            {hospitals.length > 0 && (
              <div className="mt-4">
                <Label>Suggested Hospitals</Label>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  {hospitals.map((hospital, index) => (
                    <li key={index} className="font-medium">{hospital}</li>
                  ))}
                </ul>
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
