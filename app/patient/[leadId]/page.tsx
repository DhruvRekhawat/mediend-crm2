'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, MessageSquare, MessageCircle, ClipboardList, Receipt, Plus, FileDown, CheckCircle2, Shield, Activity, Phone, MapPin, Stethoscope, Tag, User, XCircle, File, ExternalLink } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'
import { PatientCard } from '@/components/patient/patient-card'
import { InsuranceInitiateForm } from '@/components/insurance/insurance-initiate-form'

import { StageProgress } from '@/components/case/stage-progress'
import { ActivityTimeline } from '@/components/case/activity-timeline'
import { format } from 'date-fns'
import Link from 'next/link'
import { CaseStage } from '@prisma/client'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { 
  canAddKYPDetails, 
  canCompletePreAuth, 
  canRaisePreAuth, 
  canEditKYP,
  canSubmitKYPDetailed,
  canInitiate,
  canMarkDischarge,
  canGeneratePDF,
  canEditDischargeSheet,
  canMarkLost,
  canSuggestHospitals,
  canViewPhoneNumber,
  canFillInitiateForm
} from '@/lib/case-permissions'
import { getPhoneDisplay } from '@/lib/phone-utils'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'

interface Lead {
  id: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  hospitalName: string
  insuranceName: string | null
  ipdDrName: string | null
  treatment: string | null
  category: string | null
  status: string
  pipelineStage: string
  caseStage: CaseStage
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
}

interface KYPSubmission {
  id: string
  leadId: string
  aadhar: string | null
  pan: string | null
  insuranceCard: string | null
  disease: string | null
  location: string | null
  remark: string | null
  aadharFileUrl: string | null
  panFileUrl: string | null
  insuranceCardFileUrl: string | null
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
      roomRentPrivate?: number | null
      roomRentICU?: number | null
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

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ['lead', leadId],
    queryFn: () => apiGet<Lead>(`/api/leads/${leadId}`),
    enabled: !!leadId,
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
  const [admitSubmitting, setAdmitSubmitting] = useState(false)
  const [admitForm, setAdmitForm] = useState({
    admissionDate: '',
    admissionTime: '',
    admittingHospital: '',
    expectedSurgeryDate: '',
    notes: '',
  })
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false)
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false)
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

  if (!lead) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Patient not found</div>
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
  const canSubmitDetailed = user && canSubmitKYPDetailed(user as any, lead)
  const canInit = user && canInitiate(user as any, lead)
  const canDischarge = user && canMarkDischarge(user as any, lead)
  const canPDF = user && canGeneratePDF(user as any, lead)
  const canFillDischargeForm = user && canEditDischargeSheet(user as any, lead)
  const showMarkLost = user && canMarkLost(user as any, lead)
  const showSuggestHospitals = user && canSuggestHospitals(user as any, lead)
  const canFillInitiate = user && canFillInitiateForm(user as any, lead)

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
                <StageProgress currentStage={lead.caseStage} />
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
                {canSubmitDetailed && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/kyp/detailed`}>
                      <Stethoscope className="h-4 w-4" />
                      Submit KYP (Detailed)
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
                    onClick={() => {
                      const hospital = lead.kypSubmission?.preAuthData?.requestedHospitalName?.trim() || lead.hospitalName || ''
                      setAdmitForm({
                        admissionDate: new Date().toISOString().slice(0, 10),
                        admissionTime: '',
                        admittingHospital: hospital,
                        expectedSurgeryDate: '',
                        notes: '',
                      })
                      setShowAdmitModal(true)
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Admitted
                  </Button>
                )}
                {canDischarge && (
                  <Button
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white border-0"
                    onClick={() => setShowDischargeConfirm(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Discharged
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

        {/* Insurance Initiate Form - Only show for viewing/editing after approval, not during PREAUTH_RAISED */}
        {canFillInitiate && lead?.caseStage !== CaseStage.PREAUTH_RAISED && initiateFormData?.data?.initiateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Insurance Initiate Form</CardTitle>
              <CardDescription>View or edit the initiate form details</CardDescription>
            </CardHeader>
            <CardContent>
              <InsuranceInitiateForm
                leadId={leadId}
                initialData={initiateFormData?.data?.initiateForm}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['insurance-initiate-form', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Patient Card - Unified View */}
        <PatientCard lead={lead as any} />

        {/* Follow-Up Section */}
        {lead.kypSubmission?.followUpData && kypSubmission?.followUpData && (
          <Card>
            <CardHeader>
              <CardTitle>Follow-Up Details</CardTitle>
              <CardDescription>Patient admission and surgery information</CardDescription>
            </CardHeader>
            <CardContent>
              <FollowUpDetailsView followUpData={kypSubmission.followUpData} />
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

        {/* Mark Admitted Modal */}
        <Dialog open={showAdmitModal} onOpenChange={setShowAdmitModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Admitted</DialogTitle>
              <DialogDescription>
                Record admission details. Insurance will be notified.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!admitForm.admissionDate || !admitForm.admittingHospital.trim()) {
                  toast.error('Admission date and hospital are required')
                  return
                }
                setAdmitSubmitting(true)
                try {
                  await apiPost(`/api/leads/${leadId}/initiate`, {
                    admissionDate: admitForm.admissionDate,
                    admissionTime: admitForm.admissionTime || undefined,
                    admittingHospital: admitForm.admittingHospital.trim(),
                    expectedSurgeryDate: admitForm.expectedSurgeryDate || undefined,
                    notes: admitForm.notes || undefined,
                  })
                  toast.success('Patient marked as admitted. Insurance has been notified.')
                  setShowAdmitModal(false)
                  queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                  queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to mark admitted')
                } finally {
                  setAdmitSubmitting(false)
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date *</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={admitForm.admissionDate}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admissionDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionTime">Admission Time</Label>
                <Input
                  id="admissionTime"
                  type="time"
                  value={admitForm.admissionTime}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admissionTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admittingHospital">Admitting Hospital *</Label>
                <Input
                  id="admittingHospital"
                  value={admitForm.admittingHospital}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, admittingHospital: e.target.value }))
                  }
                  placeholder="Hospital name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedSurgeryDate">Expected Surgery Date</Label>
                <Input
                  id="expectedSurgeryDate"
                  type="date"
                  value={admitForm.expectedSurgeryDate}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, expectedSurgeryDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={admitForm.notes}
                  onChange={(e) =>
                    setAdmitForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdmitModal(false)}
                  disabled={admitSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={admitSubmitting}>
                  {admitSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Admitted
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mark Discharged confirmation */}
        <Dialog open={showDischargeConfirm} onOpenChange={setShowDischargeConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Discharged</DialogTitle>
              <DialogDescription>
                Mark this patient as discharged? Insurance will be notified and can then fill the discharge form and send to PL.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDischargeConfirm(false)}
                disabled={dischargeSubmitting}
              >
                Cancel
              </Button>
              <Button
                disabled={dischargeSubmitting}
                onClick={async () => {
                  setDischargeSubmitting(true)
                  try {
                    await apiPost(`/api/leads/${leadId}/discharge`, {})
                    toast.success('Patient marked as discharged. Insurance has been notified.')
                    setShowDischargeConfirm(false)
                    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                    queryClient.invalidateQueries({ queryKey: ['leads', 'insurance'] })
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to mark discharged')
                  } finally {
                    setDischargeSubmitting(false)
                  }
                }}
              >
                {dischargeSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Discharged
                  </>
                )}
              </Button>
            </div>
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
