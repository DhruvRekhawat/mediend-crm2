'use client'

import { IPDDetailsForm } from '@/components/admission/ipd-details-form'
import { IPDMarkComponent } from '@/components/admission/ipd-mark-component'
import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { InsuranceInitiateForm } from '@/components/insurance/insurance-initiate-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { apiGet, apiPost } from '@/lib/api-client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ArrowLeft, CheckCircle2, ExternalLink, File, FileDown, FileText, MapPin, MessageCircle, Phone, Plus, Receipt, Shield, Stethoscope, Tag, User, XCircle } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

import { ActivityTimeline } from '@/components/case/activity-timeline'
import { StageProgress } from '@/components/case/stage-progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  canAddKYPDetails,
  canCompletePreAuth,
  canEditDischargeSheet,
  canEditKYP,
  canFillInitiateForm,
  canGeneratePDF,
  canInitiate,
  canMarkIPD,
  canMarkLost,
  canRaisePreAuth,
  canSuggestHospitals,
  canViewPhoneNumber,
  isDischargeBlockedByInitiateForm,
} from '@/lib/case-permissions'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'
import { getPhoneDisplay } from '@/lib/phone-utils'
import { CaseStage } from '@prisma/client'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

interface Lead {
  id: string
  leadRef: string
  patientName: string
  age?: number
  sex?: string
  phoneNumber: string
  alternateNumber?: string | null
  attendantName?: string | null
  attendantContactNo?: string | null
  circle?: string
  city: string
  hospitalName: string
  insuranceName: string | null
  insuranceType?: string | null
  ipdDrName: string | null
  treatment: string | null
  category: string | null
  quantityGrade?: string | null
  anesthesia?: string | null
  surgeonName?: string | null
  surgeonType?: string | null
  status: string
  pipelineStage: string
  caseStage: CaseStage
  bd?: { name?: string; manager?: { name?: string } | null } | null
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
    location?: string | null
    area?: string | null
    aadhar?: string | null
    pan?: string | null
    insuranceCard?: string | null
    disease?: string | null
    remark?: string | null
    patientConsent?: boolean
    aadharFileUrl?: string | null
    panFileUrl?: string | null
    insuranceCardFileUrl?: string | null
    prescriptionFileUrl?: string | null
    diseasePhotos?: Array<{ name: string; url: string }> | null
    otherFiles?: Array<{ name: string; url: string }> | null
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
    } | null
    followUpData?: {
      id: string
    } | null
  } | null
  dischargeSheet?: {
    id: string
  } | null
  insuranceInitiateForm?: {
    id: string
  } | null
  admissionRecord?: {
    id: string
    ipdStatus?: string | null
  } | null
}

interface KYPSubmission {
  id: string
  leadId: string
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
  diseasePhotos: Array<{ name: string; url: string }> | null
  otherFiles: Array<{ name: string; url: string }> | null
  status: 'PENDING' | 'KYP_DETAILS_ADDED' | 'PRE_AUTH_COMPLETE' | 'FOLLOW_UP_COMPLETE' | 'COMPLETED'
  submittedAt: string
  lead: {
    id: string
    leadRef: string
    patientName: string
    phoneNumber: string
    city: string
    hospitalName: string
  }
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
    hospitalNameSuggestion: string | null
    hospitalSuggestions?: string[] | null
    roomTypes?: Array<{ name: string; rent: string }> | null
    suggestedHospitals?: Array<{
      id: string
      hospitalName: string
      tentativeBill?: number | null
      roomRentGeneral?: number | null
      roomRentSingle?: number | null
      roomRentDeluxe?: number | null
      roomRentSemiPrivate?: number | null
      notes?: string | null
    }> | null
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
}

export default function PatientDetailsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const leadId = params.leadId as string

  const { data: lead, isLoading, error } = useQuery<Lead, Error>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
    retry: false,
  })

  const { data: kypSubmission, isLoading: isLoadingKYP } = useQuery<KYPSubmission | null>({
    queryKey: ['kyp-submission', leadId],
    queryFn: async () => {
      const submissions = await apiGet<KYPSubmission[]>('/api/kyp')
      return submissions.find((s) => s.leadId === leadId) || null
    },
    enabled: !!leadId && !!lead?.kypSubmission,
  })

  const { data: stageHistory } = useQuery<any[]>({
    queryKey: ['stage-history', leadId],
    queryFn: () => apiGet<any[]>(`/api/leads/${leadId}/stage-history`),
    enabled: !!leadId,
  })

  const { data: initiateFormData } = useQuery<any>({
    queryKey: ['insurance-initiate-form', leadId],
    queryFn: () => apiGet<any>(`/api/insurance-initiate-form?leadId=${leadId}`),
    enabled: !!leadId && (lead?.caseStage === CaseStage.PREAUTH_RAISED || lead?.caseStage === CaseStage.PREAUTH_COMPLETE || lead?.caseStage === CaseStage.INITIATED),
  })

  const [showAdmitModal, setShowAdmitModal] = useState(false)
  const [showIPDMarkModal, setShowIPDMarkModal] = useState(false)
  const [showMarkLostDialog, setShowMarkLostDialog] = useState(false)
  const [markLostReason, setMarkLostReason] = useState<string>('')
  const [pdfDownloading, setPdfDownloading] = useState(false)
  const [markLostDetail, setMarkLostDetail] = useState('')
  const [markLostSubmitting, setMarkLostSubmitting] = useState(false)

  if (isLoading || isLoadingKYP) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading patient details...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (error || !lead) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive font-semibold text-lg">
            {error ? error.message : 'Patient not found'}
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </AuthenticatedLayout>
    )
  }

  const getStatusBadgeColor = (status: string) => {
    const badgeConfig: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      KYP_DETAILS_ADDED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      PRE_AUTH_COMPLETE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      FOLLOW_UP_COMPLETE: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    }
    return badgeConfig[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`border-0 ${getStatusBadgeColor(status)}`}>
        {getKYPStatusLabel(status)}
      </Badge>
    )
  }

  const getStageBadgeColor = (stage: CaseStage) => {
    const colors: Record<CaseStage, string> = {
      [CaseStage.NEW_LEAD]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300',
      [CaseStage.KYP_BASIC_PENDING]: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300',
      [CaseStage.KYP_BASIC_COMPLETE]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-300',
      [CaseStage.KYP_DETAILED_PENDING]: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300',
      [CaseStage.KYP_DETAILED_COMPLETE]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300',
      [CaseStage.KYP_PENDING]: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300',
      [CaseStage.KYP_COMPLETE]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300',
      [CaseStage.HOSPITALS_SUGGESTED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300',
      [CaseStage.PREAUTH_RAISED]: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 border-teal-300',
      [CaseStage.PREAUTH_COMPLETE]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-300',
      [CaseStage.INITIATED]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300',
      [CaseStage.ADMITTED]: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300',
      [CaseStage.DISCHARGED]: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300',
      [CaseStage.IPD_DONE]: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 border-teal-300',
      [CaseStage.PL_PENDING]: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-300',
      [CaseStage.OUTSTANDING]: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-300',
    }
    return colors[stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300 border-gray-300'
  }

  // Permission checks - cast user to match expected type
  const canRaise = user && canRaisePreAuth(user as any, lead)
  const canAddDetails = user && canAddKYPDetails(user as any, lead)
  const canComplete = user && canCompletePreAuth(user as any, lead)
  const canEdit = user && canEditKYP(user as any, lead)
  const canInit = user && canInitiate(user as any, lead)
  const canMarkIPDStatus = user && canMarkIPD(user as any, lead)
  const canPDF = user && canGeneratePDF(user as any, lead)
  const canFillDischargeForm = user && canEditDischargeSheet(user as any, lead)
  const showMarkLost = user && canMarkLost(user as any, lead)
  const showSuggestHospitals = user && canSuggestHospitals(user as any, lead)
  const canFillInitiate = user && canFillInitiateForm(user as any, lead)
  const isDischargeBlocked = user && isDischargeBlockedByInitiateForm(user as any, lead)

  // Collect all uploaded documents for grid (KYP + PreAuth)
  const uploadedDocuments = (() => {
    const items: { title: string; url: string; isImage: boolean }[] = []
    const kyp = lead?.kypSubmission
    if (!kyp) return items
    const add = (title: string, url: string) => {
      const u = url?.toLowerCase() || ''
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(u) || u.includes('jpg') || u.includes('png')
      items.push({ title, url, isImage })
    }
    if (kyp.insuranceCardFileUrl) add('Insurance Card', kyp.insuranceCardFileUrl)
    if (kyp.aadharFileUrl) add('Aadhar', kyp.aadharFileUrl)
    if (kyp.panFileUrl) add('PAN', kyp.panFileUrl)
    if (kyp.prescriptionFileUrl) add('Prescription', kyp.prescriptionFileUrl)
    const diseasePhotos = (kyp.diseasePhotos as Array<{ name: string; url: string }>) || []
    diseasePhotos.forEach((p) => add(p.name || 'Disease photo', p.url))
    const otherFiles = (kyp.otherFiles as Array<{ name: string; url: string }>) || []
    otherFiles.forEach((f) => add(f.name || 'Document', f.url))
    const diseaseImages = (kyp.preAuthData?.diseaseImages as Array<{ name: string; url: string }>) || []
    diseaseImages.forEach((p) => add(p.name || 'Disease image', p.url))
    return items
  })()

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Professional Header Section */}

            <div className="space-y-6">
              {/* Top Row: Back Button and Patient Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{lead.patientName}</h1>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {lead.leadRef}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <Link href={`/chat/${leadId}`}>
                      <MessageCircle className="h-4 w-4" />
                      Open Chat
                    </Link>
                  </Button>
                  <Badge variant="outline" className="border-gray-300 dark:border-gray-700">
                    {lead.pipelineStage}
                  </Badge>
                  <Badge className={`border-2 ${getStageBadgeColor(lead.caseStage)}`}>
                    {lead.caseStage.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              {/* Patient Info Grid */}
              {(() => {
                const city = lead.kypSubmission?.location?.trim() || lead.city
                const area = lead.kypSubmission?.area?.trim() || null
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Phone</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{getPhoneDisplay(lead.phoneNumber, canViewPhoneNumber(user))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                        <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">City</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{city || '-'}</p>
                      </div>
                    </div>
                    {area && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Area</p>
                          <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{area}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Treatment</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.treatment || '-'}</p>
                      </div>
                    </div>
                    {lead.insuranceName && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Insurance</p>
                          <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.insuranceName}</p>
                        </div>
                      </div>
                    )}
                    {lead.ipdDrName && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Doctor</p>
                          <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.ipdDrName}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                        <Tag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Category</p>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.category || '-'}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Compact Stage Progress */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="mb-3">
                  <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">Case Progress</p>
                </div>
                <StageProgress
                  currentStage={lead.caseStage}
                  hasInitiateForm={!!lead.insuranceInitiateForm?.id}
                  hasIpdMark={!!lead.admissionRecord?.ipdStatus}
                />
              </div>
            </div>


        {/* Uploaded Documents Grid */}
        {uploadedDocuments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {uploadedDocuments.map((doc, index) => (
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
        )}

        {/* Action Buttons Section */}
        {user && (
          <Card className="border-2 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Actions</CardTitle>
              <CardDescription>Available actions based on case stage and your role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {/* BD Actions */}
                {!lead.kypSubmission && (user.role === 'BD' || user.role === 'ADMIN') && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/kyp/basic`}>
                      <Plus className="h-4 w-4" />
                      Start KYP
                    </Link>
                  </Button>
                )}
                {canRaise && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/raise-preauth`}>
                      <FileText className="h-4 w-4" />
                      Raise Pre-Auth
                    </Link>
                  </Button>
                )}
                {canInit && (
                  <Button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-0"
                    onClick={() => setShowAdmitModal(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Admitted
                  </Button>
                )}
                {canMarkIPDStatus && (
                  <Button
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0"
                    onClick={() => setShowIPDMarkModal(true)}
                  >
                    <Activity className="h-4 w-4" />
                    Update IPD Status
                  </Button>
                )}
                
                {/* Insurance: Suggest hospitals (when KYP Basic just submitted – KYP_BASIC_COMPLETE) */}
                {showSuggestHospitals && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <Shield className="h-4 w-4" />
                      Suggest hospitals
                    </Link>
                  </Button>
                )}
                {canAddDetails && !showSuggestHospitals && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <Plus className="h-4 w-4" />
                      Add KYP Details
                    </Link>
                  </Button>
                )}
                {canComplete && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete Pre-Auth
                    </Link>
                  </Button>
                )}
                {canFillInitiate && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/pre-auth?initiate=true`}>
                      <FileText className="h-4 w-4" />
                      Fill Initial Form
                    </Link>
                  </Button>
                )}
                {canPDF && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-2"
                    disabled={pdfDownloading}
                    onClick={async () => {
                      const win = window.open('', '_blank')
                      setPdfDownloading(true)
                      try {
                        const result = await apiPost<{ pdfUrl: string }>(`/api/leads/${leadId}/preauth-pdf`, { recipients: [] })
                        const pdfUrl = result?.pdfUrl
                        if (pdfUrl) {
                          if (win) win.location.href = pdfUrl
                          else window.open(pdfUrl, '_blank', 'noopener,noreferrer')
                          toast.success('PDF ready')
                        } else {
                          if (win) win.close()
                          toast.error('Failed to generate PDF')
                        }
                      } catch (e) {
                        if (win) win.close()
                        toast.error(e instanceof Error ? e.message : 'Error generating PDF')
                      } finally {
                        setPdfDownloading(false)
                      }
                    }}
                  >
                    {pdfDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {pdfDownloading ? 'Generating…' : 'Download PDF'}
                  </Button>
                )}
                {canFillDischargeForm && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/discharge`}>
                      <Receipt className="h-4 w-4" />
                      {lead.dischargeSheet ? 'View Discharge Sheet' : 'Fill Discharge Form'}
                    </Link>
                  </Button>
                )}
                {isDischargeBlocked && (
                  <div className="flex items-center gap-2">
                    <Button
                      disabled
                      className="flex items-center gap-2 bg-gray-400 dark:bg-gray-600 text-white border-0 cursor-not-allowed"
                      title="You must fill the Insurance Initial Form (from the Pre-Auth page) before you can fill the discharge form."
                    >
                      <Receipt className="h-4 w-4" />
                      Fill Discharge Form
                    </Button>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⚠ Fill the Initial Form first
                    </span>
                  </div>
                )}
                {showMarkLost && (
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                    onClick={() => setShowMarkLostDialog(true)}
                  >
                    <XCircle className="h-4 w-4" />
                    Mark Lost
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KYP Details Section */}
        {kypSubmission && (
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <CardTitle>KYP Details</CardTitle>
                  {getStatusBadge(kypSubmission.status)}
                  {/* Case stage status chip */}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-400">
                    <Activity className="w-3 h-3" />
                    {lead.caseStage.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Submitted by <span className="font-semibold">{kypSubmission.submittedBy.name}</span> on {format(new Date(kypSubmission.submittedAt), 'PPp')}
                </div>
              </div>
              {/* Follow-up / KYP status details row */}
              {kypSubmission.followUpData && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 border-t border-green-100 dark:border-green-900/30 pt-3">
                  {kypSubmission.followUpData.admissionDate && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-500" />
                      Admission: <strong>{format(new Date(kypSubmission.followUpData.admissionDate), 'dd MMM yyyy')}</strong>
                    </span>
                  )}
                  {kypSubmission.followUpData.surgeryDate && (
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-purple-500" />
                      Surgery: <strong>{format(new Date(kypSubmission.followUpData.surgeryDate), 'dd MMM yyyy')}</strong>
                    </span>
                  )}
                  {kypSubmission.followUpData.hospitalName && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-500" />
                      {kypSubmission.followUpData.hospitalName}
                    </span>
                  )}
                  {kypSubmission.followUpData.doctorName && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-500" />
                      Dr. {kypSubmission.followUpData.doctorName}
                    </span>
                  )}
                  {kypSubmission.followUpData.updatedAt && (
                    <span className="ml-auto flex items-center gap-1 text-gray-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Updated {format(new Date(kypSubmission.followUpData.updatedAt), 'dd MMM, HH:mm')}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Personal & ID Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <User className="w-4 h-4 text-blue-600" />
                    Personal & ID Details
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Aadhar Number</Label>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold">{kypSubmission.aadhar || '-'}</p>
                        {kypSubmission.aadharFileUrl && (
                          <Button asChild variant="link" size="sm" className="h-auto p-0 text-blue-600">
                            <a href={kypSubmission.aadharFileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">PAN Number</Label>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold">{kypSubmission.pan || '-'}</p>
                        {kypSubmission.panFileUrl && (
                          <Button asChild variant="link" size="sm" className="h-auto p-0 text-blue-600">
                            <a href={kypSubmission.panFileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insurance & Medical */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Shield className="w-4 h-4 text-purple-600" />
                    Insurance & Medical
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Insurance Policy</Label>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold">{kypSubmission.insuranceCard || lead.insuranceName || '-'}</p>
                        {kypSubmission.insuranceCardFileUrl && (
                          <Button asChild variant="link" size="sm" className="h-auto p-0 text-blue-600">
                            <a href={kypSubmission.insuranceCardFileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Treating Doctor</Label>
                      <p className="text-sm font-semibold mt-1">{lead.ipdDrName || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Location & Case */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Location & Case
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Location (City/Area)</Label>
                      <p className="text-sm font-semibold mt-1">
                        {kypSubmission.location || lead.city}{kypSubmission.area ? `, ${kypSubmission.area}` : ''}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Treatment/Disease</Label>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-semibold">{kypSubmission.disease || lead.treatment || '-'}</p>
                        {kypSubmission.prescriptionFileUrl && (
                          <Button asChild variant="link" size="sm" className="h-auto p-0 text-blue-600">
                            <a href={kypSubmission.prescriptionFileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> Rx
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Files & Remarks */}
              {(kypSubmission.remark || (kypSubmission.otherFiles && kypSubmission.otherFiles.length > 0) || (kypSubmission.diseasePhotos && kypSubmission.diseasePhotos.length > 0)) && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {kypSubmission.remark && (
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Remarks</Label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 bg-amber-50/30 dark:bg-amber-950/10 p-3 rounded-lg border border-amber-100/50 dark:border-amber-900/20 italic">
                        &quot;{kypSubmission.remark}&quot;
                      </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Additional Documents</Label>
                      <div className="flex flex-wrap gap-2">
                        {kypSubmission.diseasePhotos?.map((p, i) => (
                          <Button key={i} asChild variant="outline" size="sm" className="h-8 text-[11px] gap-1">
                            <a href={p.url} target="_blank" rel="noopener noreferrer">
                              <File className="w-3 h-3" /> {p.name || `Photo ${i+1}`}
                            </a>
                          </Button>
                        ))}
                        {kypSubmission.otherFiles?.map((f, i) => (
                          <Button key={i} asChild variant="outline" size="sm" className="h-8 text-[11px] gap-1">
                            <a href={f.url} target="_blank" rel="noopener noreferrer">
                              <File className="w-3 h-3" /> {f.name || `Doc ${i+1}`}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}




        {/* Discharge Sheet Link */}
        {lead.dischargeSheet && (
          <Card>
            <CardHeader>
              <CardTitle>Discharge Sheet</CardTitle>
              <CardDescription>Patient discharge information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={`/patient/${leadId}/discharge`}>
                  <Receipt className="h-4 w-4 mr-2" />
                  View Discharge Sheet
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Activity Timeline */}
        {stageHistory && <ActivityTimeline history={stageHistory} />}

        {/* Mark Admitted Modal — Full IPD Details Form */}
        <Dialog open={showAdmitModal} onOpenChange={setShowAdmitModal}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Step 6: IPD Details</DialogTitle>
              <DialogDescription>
                Fill all admission details. Insurance will be notified once saved.
              </DialogDescription>
            </DialogHeader>
            {lead && (
              <IPDDetailsForm
                leadId={leadId}
                patientName={lead.patientName}
                leadRef={lead.leadRef}
                age={lead.age}
                sex={lead.sex}
                phoneNumber={lead.phoneNumber}
                alternateNumber={lead.alternateNumber ?? undefined}
                attendantName={lead.attendantName ?? undefined}
                attendantContactNo={lead.attendantContactNo ?? undefined}
                circle={lead.circle}
                city={lead.city}
                category={lead.category ?? undefined}
                treatment={lead.treatment ?? undefined}
                quantityGrade={lead.quantityGrade ?? undefined}
                anesthesia={lead.anesthesia ?? undefined}
                surgeonName={lead.ipdDrName || lead.surgeonName || undefined}
                surgeonType={lead.surgeonType ?? undefined}
                hospitalName={lead.hospitalName}
                insuranceName={lead.insuranceName ?? undefined}
                insuranceType={lead.insuranceType ?? undefined}
                tpa={lead.kypSubmission?.preAuthData?.tpa ?? undefined}
                sumInsured={lead.kypSubmission?.preAuthData?.sumInsured ?? undefined}
                copay={lead.kypSubmission?.preAuthData?.copay ?? undefined}
                capping={lead.kypSubmission?.preAuthData?.capping ?? undefined}
                roomType={lead.kypSubmission?.preAuthData?.requestedRoomType ?? undefined}
                roomRent={lead.kypSubmission?.preAuthData?.roomRent ?? undefined}
                bdName={lead.bd?.name}
                bdManagerName={lead.bd?.manager?.name ?? undefined}
                onSuccess={() => {
                  setShowAdmitModal(false)
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
                }}
                onCancel={() => setShowAdmitModal(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* IPD Mark Modal */}
        <Dialog open={showIPDMarkModal} onOpenChange={setShowIPDMarkModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update IPD Status</DialogTitle>
              <DialogDescription>
                Update the current status of the patient in IPD.
              </DialogDescription>
            </DialogHeader>
            <IPDMarkComponent
              leadId={leadId}
              onSuccess={() => {
                setShowIPDMarkModal(false)
                queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
              }}
              onCancel={() => setShowIPDMarkModal(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showMarkLostDialog} onOpenChange={setShowMarkLostDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Case as Lost</DialogTitle>
              <DialogDescription>
                Provide a reason. This will move the case to the Lost pipeline stage.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="markLostReason">Reason *</Label>
                <select
                  id="markLostReason"
                  value={markLostReason}
                  onChange={(e) => setMarkLostReason(e.target.value)}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select reason</option>
                  <option value="Patient Declined">Patient Declined</option>
                  <option value="Ghosted">Ghosted</option>
                  <option value="Financial Issue">Financial Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="markLostDetail">Additional details (optional)</Label>
                <Textarea
                  id="markLostDetail"
                  value={markLostDetail}
                  onChange={(e) => setMarkLostDetail(e.target.value)}
                  placeholder="Any additional context"
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMarkLostDialog(false)
                    setMarkLostReason('')
                    setMarkLostDetail('')
                  }}
                  disabled={markLostSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!markLostReason || markLostSubmitting}
                  onClick={async () => {
                    setMarkLostSubmitting(true)
                    try {
                      await apiPost(`/api/leads/${leadId}/mark-lost`, {
                        lostReason: markLostReason,
                        lostReasonDetail: markLostDetail.trim() || undefined,
                      })
                      toast.success('Case marked as lost')
                      setShowMarkLostDialog(false)
                      setMarkLostReason('')
                      setMarkLostDetail('')
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['case-chat', leadId] })
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to mark as lost')
                    } finally {
                      setMarkLostSubmitting(false)
                    }
                  }}
                >
                  {markLostSubmitting ? 'Saving...' : 'Mark Lost'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}
