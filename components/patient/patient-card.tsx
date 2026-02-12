'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { 
  User, Phone, MapPin, Building2, CreditCard, FileText, Stethoscope, 
  Calendar, ExternalLink, File, CheckCircle2, XCircle, AlertCircle,
  Hospital, DollarSign, Shield, ClipboardList
} from 'lucide-react'
import { CaseStage, PreAuthStatus } from '@prisma/client'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { canViewPhoneNumber } from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'

interface PatientCardProps {
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
    treatment: string | null
    category: string | null
    caseStage: CaseStage
    kypSubmission?: {
      id: string
      aadhar: string | null
      pan: string | null
      insuranceCard: string | null
      disease: string | null
      location: string | null
      area: string | null
      remark: string | null
      aadharFileUrl: string | null
      panFileUrl: string | null
      insuranceCardFileUrl: string | null
      prescriptionFileUrl: string | null
      diseasePhotos?: Array<{ name: string; url: string }> | null
      otherFiles?: Array<{ name: string; url: string }> | null
      patientConsent: boolean
      status: string
      submittedAt: string
      submittedBy: {
        id: string
        name: string
      }
      preAuthData?: {
        id: string
        sumInsured: string | null
        roomRent: string | null
        capping: string | null
        copay: string | null
        icu: string | null
        insurance: string | null
        tpa: string | null
        hospitalNameSuggestion: string | null
        hospitalSuggestions?: string[] | null
        roomTypes?: Array<{ name: string; rent: string }> | null
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
        suggestedHospitals?: Array<{
          id: string
          hospitalName: string
          tentativeBill?: number | null
          roomRentGeneral?: number | null
          roomRentPrivate?: number | null
          roomRentICU?: number | null
          notes?: string | null
        }> | null
      } | null
      followUpData?: {
        id: string
        admissionDate: string | null
        surgeryDate: string | null
        prescription: string | null
        report: string | null
        hospitalName: string | null
        doctorName: string | null
        prescriptionFileUrl: string | null
        reportFileUrl: string | null
        updatedAt: string
        updatedBy: {
          id: string
          name: string
        } | null
      } | null
    } | null
  }
}

export function PatientCard({ lead }: PatientCardProps) {
  const { user } = useAuth()
  const [kypOpen, setKypOpen] = useState(true)
  const [preAuthOpen, setPreAuthOpen] = useState(true)
  const [documentsOpen, setDocumentsOpen] = useState(false)

  const kyp = lead.kypSubmission
  const preAuth = kyp?.preAuthData
  const followUp = kyp?.followUpData

  // Collect all documents
  const documents: Array<{ title: string; url: string; type: 'insurance' | 'identity' | 'medical' | 'other' }> = []
  
  if (kyp?.insuranceCardFileUrl) {
    documents.push({ title: 'Insurance Card', url: kyp.insuranceCardFileUrl, type: 'insurance' })
  }
  if (kyp?.aadharFileUrl) {
    documents.push({ title: 'Aadhar', url: kyp.aadharFileUrl, type: 'identity' })
  }
  if (kyp?.panFileUrl) {
    documents.push({ title: 'PAN', url: kyp.panFileUrl, type: 'identity' })
  }
  if (kyp?.prescriptionFileUrl) {
    documents.push({ title: 'Prescription', url: kyp.prescriptionFileUrl, type: 'medical' })
  }
  const diseasePhotos = (kyp?.diseasePhotos as Array<{ name: string; url: string }>) || []
  diseasePhotos.forEach((p) => {
    documents.push({ title: p.name || 'Disease Photo', url: p.url, type: 'medical' })
  })
  const diseaseImages = (preAuth?.diseaseImages as Array<{ name: string; url: string }>) || []
  diseaseImages.forEach((p) => {
    documents.push({ title: p.name || 'Disease Image', url: p.url, type: 'medical' })
  })
  const otherFiles = (kyp?.otherFiles as Array<{ name: string; url: string }>) || []
  otherFiles.forEach((f) => {
    documents.push({ title: f.name || 'Document', url: f.url, type: 'other' })
  })
  if (followUp?.prescriptionFileUrl) {
    documents.push({ title: 'Follow-up Prescription', url: followUp.prescriptionFileUrl, type: 'medical' })
  }
  if (followUp?.reportFileUrl) {
    documents.push({ title: 'Follow-up Report', url: followUp.reportFileUrl, type: 'medical' })
  }

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      KYP_DETAILS_ADDED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      PRE_AUTH_COMPLETE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      FOLLOW_UP_COMPLETE: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }

  const suggestedHospitals = preAuth?.suggestedHospitals || []
  const legacyHospitals = (preAuth?.hospitalSuggestions as string[]) || []

  return (
    <div className="space-y-4">
      {/* Basic Patient Information */}
      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Patient Information
          </CardTitle>
          <CardDescription>Core patient details and case information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Patient Name</Label>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead.patientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Phone</Label>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getPhoneDisplay(lead.phoneNumber, canViewPhoneNumber(user))}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">City</Label>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{kyp?.location?.trim() || lead.city || '-'}</p>
                {kyp?.area && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Area: {kyp.area}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Treatment</Label>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead.treatment?.trim() || kyp?.disease?.trim() || '-'}</p>
              </div>
            </div>
            {lead.category && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                  <ClipboardList className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Category</Label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{lead.category}</p>
                </div>
              </div>
            )}
            {followUp?.hospitalName && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <Hospital className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Admitted Hospital</Label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{followUp.hospitalName}</p>
                </div>
              </div>
            )}
            {followUp?.admissionDate && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Admission Date</Label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {format(new Date(followUp.admissionDate), 'PP')}
                  </p>
                </div>
              </div>
            )}
            {followUp?.surgeryDate && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400">Surgery Date</Label>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {format(new Date(followUp.surgeryDate), 'PP')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KYP Details Section */}
      {kyp && (
        <Card className="border-2 shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            onClick={() => setKypOpen(!kypOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                <CardTitle>KYP Details</CardTitle>
                <Badge className={`ml-2 border-0 ${getStatusBadgeColor(kyp.status)}`}>
                  {getKYPStatusLabel(kyp.status)}
                </Badge>
              </div>
              {kypOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <CardDescription>Know Your Patient submission details</CardDescription>
          </CardHeader>
          {kypOpen && (
            <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Identity Documents
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Aadhar</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.aadhar || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">PAN</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.pan || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Insurance Card</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.insuranceCard || '-'}</p>
                      </div>
                      {kyp.prescriptionFileUrl && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Prescription</Label>
                          <a
                            href={kyp.prescriptionFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View prescription
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                      Medical Information
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Disease / Treatment</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.disease?.trim() || lead.treatment?.trim() || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">City (Location)</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.location?.trim() || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Area</Label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.area?.trim() || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">Patient Consent</Label>
                        <Badge variant={kyp.patientConsent ? 'default' : 'secondary'} className="mt-1">
                          {kyp.patientConsent ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Given
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </div>
                      {kyp.remark && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Remark</Label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{kyp.remark}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Documents from KYP (prescription, disease photos, other files) */}
                  {(kyp.prescriptionFileUrl || (Array.isArray(kyp.diseasePhotos) && kyp.diseasePhotos.length > 0) || (Array.isArray(kyp.otherFiles) && kyp.otherFiles.length > 0)) && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <File className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        Documents
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {kyp.prescriptionFileUrl && (
                          <a
                            href={kyp.prescriptionFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Prescription
                          </a>
                        )}
                        {Array.isArray(kyp.diseasePhotos) &&
                          kyp.diseasePhotos.map((p: { name: string; url: string }, i: number) => (
                            <a
                              key={i}
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {p.name || 'Disease photo'}
                            </a>
                          ))}
                        {Array.isArray(kyp.otherFiles) &&
                          kyp.otherFiles.map((f: { name: string; url: string }, i: number) => (
                            <a
                              key={i}
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {f.name || 'Document'}
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Submitted by: <strong>{kyp.submittedBy.name}</strong></span>
                    <span>•</span>
                    <span>{format(new Date(kyp.submittedAt), 'PPpp')}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

      {/* Pre-Auth Details Section */}
      {preAuth && (
        <Card className="border-2 shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            onClick={() => setPreAuthOpen(!preAuthOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Pre-Authorization Details</CardTitle>
                {preAuth.approvalStatus && (
                  <Badge 
                    variant={preAuth.approvalStatus === PreAuthStatus.APPROVED ? 'default' : preAuth.approvalStatus === PreAuthStatus.REJECTED ? 'destructive' : 'secondary'}
                    className="ml-2"
                  >
                    {preAuth.approvalStatus === PreAuthStatus.APPROVED ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </>
                    ) : preAuth.approvalStatus === PreAuthStatus.REJECTED ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                      </>
                    ) : (
                      'Pending'
                    )}
                  </Badge>
                )}
              </div>
              {preAuthOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <CardDescription>Insurance policy and pre-authorization information</CardDescription>
          </CardHeader>
          {preAuthOpen && (
            <CardContent className="pt-0">
                {/* Insurance Details */}
                {(preAuth.sumInsured || preAuth.roomRent || preAuth.capping || preAuth.copay || preAuth.icu || preAuth.insurance || preAuth.tpa) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Insurance Policy Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {preAuth.sumInsured && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Sum Insured</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.sumInsured}</p>
                        </div>
                      )}
                      {preAuth.roomRent && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Room Rent</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.roomRent}</p>
                        </div>
                      )}
                      {preAuth.capping && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Capping</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.capping}</p>
                        </div>
                      )}
                      {preAuth.copay && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Copay</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.copay}</p>
                        </div>
                      )}
                      {preAuth.icu && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">ICU</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.icu}</p>
                        </div>
                      )}
                      {preAuth.insurance && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Insurance Company</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.insurance}</p>
                        </div>
                      )}
                      {preAuth.tpa && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">TPA</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.tpa}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hospital Suggestions - Prominently displayed for BD */}
                {(suggestedHospitals.length > 0 || legacyHospitals.length > 0) && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Hospital className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Suggested Hospitals by Insurance
                      </h3>
                      {(preAuth.copay || preAuth.tpa) && (
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          {preAuth.copay && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Copay: {preAuth.copay}
                            </span>
                          )}
                          {preAuth.tpa && (
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              TPA: {preAuth.tpa}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedHospitals.map((hospital) => (
                        <div
                          key={hospital.id}
                          className="rounded-lg border-2 border-gray-200 dark:border-gray-800 p-4 hover:border-green-400 dark:hover:border-green-600 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">{hospital.hospitalName}</div>
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {hospital.tentativeBill != null && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-3 h-3" />
                                <span>Tentative Bill: ₹{hospital.tentativeBill.toLocaleString()}</span>
                              </div>
                            )}
                            {(hospital.roomRentGeneral != null || hospital.roomRentPrivate != null || hospital.roomRentICU != null) && (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3" />
                                <span>
                                  Room: {[
                                    hospital.roomRentGeneral != null && `General ₹${hospital.roomRentGeneral.toLocaleString()}`,
                                    hospital.roomRentPrivate != null && `Private ₹${hospital.roomRentPrivate.toLocaleString()}`,
                                    hospital.roomRentICU != null && `ICU ₹${hospital.roomRentICU.toLocaleString()}`
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                            {hospital.notes && (
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                                {hospital.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {legacyHospitals.map((hospital, index) => (
                        <div
                          key={index}
                          className="rounded-lg border-2 border-gray-200 dark:border-gray-800 p-4"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">{hospital}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BD Request Details */}
                {(preAuth.requestedHospitalName || preAuth.requestedRoomType || preAuth.diseaseDescription) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      BD Pre-Auth Request
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {preAuth.requestedHospitalName && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Requested Hospital</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.requestedHospitalName}</p>
                        </div>
                      )}
                      {preAuth.requestedRoomType && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Requested Room Type</Label>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preAuth.requestedRoomType}</p>
                        </div>
                      )}
                      {preAuth.diseaseDescription && (
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Disease Description</Label>
                          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap mt-1">
                            {preAuth.diseaseDescription}
                          </p>
                        </div>
                      )}
                      {preAuth.preAuthRaisedAt && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Raised At</Label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {format(new Date(preAuth.preAuthRaisedAt), 'PPpp')}
                          </p>
                        </div>
                      )}
                      {preAuth.preAuthRaisedBy && (
                        <div>
                          <Label className="text-xs text-gray-500 dark:text-gray-400">Raised By</Label>
                          <p className="text-sm text-gray-900 dark:text-gray-100">{preAuth.preAuthRaisedBy.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {preAuth.rejectionReason && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                    <Label className="text-red-900 dark:text-red-100">Rejection Reason</Label>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{preAuth.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

      {/* Documents Gallery */}
      {documents.length > 0 && (
        <Card className="border-2 shadow-sm">
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
            onClick={() => setDocumentsOpen(!documentsOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <CardTitle>Documents & Images ({documents.length})</CardTitle>
              </div>
              {documentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            <CardDescription>All uploaded documents, images, and files</CardDescription>
          </CardHeader>
          {documentsOpen && (
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {documents.map((doc, index) => (
                    <div
                      key={`${doc.url}-${index}`}
                      className="flex flex-col rounded-lg border-2 border-gray-200 dark:border-gray-800 overflow-hidden hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
                    >
                      <div className="w-full h-[200px] shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-900">
                        <iframe
                          src={doc.url}
                          title={doc.title}
                          className="w-full h-full border-0 pointer-events-none select-none"
                          style={{ overflow: 'hidden' }}
                        />
                      </div>
                      <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={doc.title}>
                          {doc.title}
                        </p>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
    </div>
  )
}
