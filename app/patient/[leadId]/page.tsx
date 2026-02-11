'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, MessageSquare, MessageCircle, ClipboardList, Receipt, Plus, FileDown, CheckCircle2, Shield, Activity, Phone, MapPin, Stethoscope, Tag, User, XCircle, File, ExternalLink } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { KYPDetailsView } from '@/components/kyp/kyp-details-view'
import { PreAuthDetailsView } from '@/components/kyp/pre-auth-details-view'

import { PreAuthRaiseForm } from '@/components/case/preauth-raise-form'
import { FollowUpDetailsView } from '@/components/kyp/follow-up-details-view'

import { KYPBasicForm } from '@/components/kyp/kyp-basic-form'
import { KYPDetailedForm } from '@/components/kyp/kyp-detailed-form'
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
  canMarkLost
} from '@/lib/case-permissions'
import { getKYPStatusLabel } from '@/lib/kyp-status-labels'
import { CaseChat } from '@/components/chat/case-chat'

interface Lead {
  id: string
  leadRef: string
  patientName: string
  phoneNumber: string
  city: string
  hospitalName: string
  treatment: string | null
  category: string | null
  status: string
  pipelineStage: string
  caseStage: CaseStage
  kypSubmission?: {
    id: string
    status: string
    submittedAt: string
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

  const [showKYPForm, setShowKYPForm] = useState(false)
  const [showKYPDetailedForm, setShowKYPDetailedForm] = useState(false)
  const [showPreAuthRaiseForm, setShowPreAuthRaiseForm] = useState(false)
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

  // Permission checks
  const canRaise = user && canRaisePreAuth(user, lead)
  const canAddDetails = user && canAddKYPDetails(user, lead)
  const canComplete = user && canCompletePreAuth(user, lead)
  const canEdit = user && canEditKYP(user, lead)
  const canSubmitDetailed = user && canSubmitKYPDetailed(user, lead)
  const canInit = user && canInitiate(user, lead)
  const canDischarge = user && canMarkDischarge(user, lead)
  const canPDF = user && canGeneratePDF(user, lead)
  const canFillDischargeForm = user && canEditDischargeSheet(user, lead)
  const showMarkLost = user && canMarkLost(user, lead)

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
                  <Badge variant="outline" className="border-gray-300 dark:border-gray-700">
                    {lead.pipelineStage}
                  </Badge>
                  <Badge className={`border-2 ${getStageBadgeColor(lead.caseStage)}`}>
                    {lead.caseStage.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              {/* Patient Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Phone</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">City</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <Stethoscope className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Treatment</p>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold text-sm">{lead.treatment || '-'}</p>
                  </div>
                </div>
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
                    onClick={() => setShowKYPForm(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  >
                    <Plus className="h-4 w-4" />
                    Start KYP
                  </Button>
                )}
                {canSubmitDetailed && (
                  <Button
                    onClick={() => setShowKYPDetailedForm(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                  >
                    <Stethoscope className="h-4 w-4" />
                    Submit KYP (Detailed)
                  </Button>
                )}
                {canRaise && (
                  <Button
                    onClick={() => setShowPreAuthRaiseForm(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0"
                  >
                    <FileText className="h-4 w-4" />
                    Raise Pre-Auth
                  </Button>
                )}
                {canInit && (
                  <Button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-0"
                    onClick={() => {
                      setAdmitForm({
                        admissionDate: new Date().toISOString().slice(0, 10),
                        admissionTime: '',
                        admittingHospital: lead.hospitalName || '',
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
                
                {/* Insurance Actions */}
                {canAddDetails && (
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
                    asChild
                    variant="outline"
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-2"
                  >
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      <FileDown className="h-4 w-4" />
                      Generate PDF
                    </Link>
                  </Button>
                )}
                {canFillDischargeForm && (
                  <Button
                    asChild
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white border-0"
                  >
                    <Link href={`/patient/${leadId}/discharge`}>
                      <Receipt className="h-4 w-4" />
                      {lead.dischargeSheet ? 'View / Edit Discharge Sheet' : 'Fill Discharge Form'}
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

        {/* Tabs */}
        <Tabs defaultValue="kyp" className="space-y-4">
          <TabsList className="border-2 bg-white dark:bg-gray-950">
            <TabsTrigger 
              value="kyp" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
            >
              <FileText className="h-4 w-4" />
              KYP
              {lead.kypSubmission && (
                <Badge className={`ml-1 border-0 ${getStatusBadgeColor(lead.kypSubmission.status)}`}>
                  {getKYPStatusLabel(lead.kypSubmission.status)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger 
              value="pre-auth" 
              className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
            >
              <MessageSquare className="h-4 w-4" />
              Pre-Auth
              {lead.caseStage === CaseStage.PREAUTH_COMPLETE && (
                <Badge className="ml-1 border-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Complete</Badge>
              )}
            </TabsTrigger>
            {lead.kypSubmission?.followUpData && (
              <TabsTrigger 
                value="follow-up" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:bg-teal-50 dark:data-[state=active]:bg-teal-950/30"
              >
                <ClipboardList className="h-4 w-4" />
                Follow-Up
              </TabsTrigger>
            )}
            {lead.dischargeSheet && (
              <TabsTrigger 
                value="discharge" 
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30"
              >
                <Receipt className="h-4 w-4" />
                Discharge Sheet
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>BD & Insurance Chat</CardTitle>
                <CardDescription>Two-way conversation for this case</CardDescription>
              </CardHeader>
              <CardContent>
                <CaseChat leadId={leadId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyp">
            {showKYPDetailedForm && canSubmitDetailed ? (
              <Card>
                <CardHeader>
                  <CardTitle>KYP (Call 2 – Detailed)</CardTitle>
                  <CardDescription>Disease, patient consent, and optional documents. Then raise pre-auth.</CardDescription>
                </CardHeader>
                <CardContent>
                  <KYPDetailedForm
                    leadId={leadId}
                    initialDisease={kypSubmission?.disease ?? ''}
                    onSuccess={() => {
                      setShowKYPDetailedForm(false)
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['case-chat', leadId] })
                    }}
                    onCancel={() => setShowKYPDetailedForm(false)}
                  />
                </CardContent>
              </Card>
            ) : showKYPForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>KYP (Call 1 – Basic)</CardTitle>
                  <CardDescription>Insurance card, city and area required. Insurance will then suggest hospitals.</CardDescription>
                </CardHeader>
                <CardContent>
                  <KYPBasicForm
                    leadId={leadId}
                    initialPatientName={lead.patientName}
                    initialPhone={lead.phoneNumber}
                    onSuccess={() => {
                      setShowKYPForm(false)
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['case-chat', leadId] })
                    }}
                    onCancel={() => setShowKYPForm(false)}
                  />
                </CardContent>
              </Card>
            ) : kypSubmission ? (
              <>
                <KYPDetailsView kypSubmission={kypSubmission} />
                {canSubmitDetailed && (
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground mb-3">Add disease, consent, and optional documents to raise pre-auth.</p>
                      <Button onClick={() => setShowKYPDetailedForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Submit KYP (Detailed)
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : canEdit ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No KYP submission found</p>
                  <Button onClick={() => setShowKYPForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start KYP
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No KYP submission found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pre-auth">
            {showPreAuthRaiseForm && kypSubmission ? (
              <Card>
                <CardHeader>
                  <CardTitle>Raise Pre-Auth</CardTitle>
                  <CardDescription>Select hospital and room type from Insurance suggestions</CardDescription>
                </CardHeader>
                <CardContent>
                  <PreAuthRaiseForm
                    leadId={leadId}
                    initialData={kypSubmission.preAuthData ? {
                      requestedHospitalName: kypSubmission.preAuthData.requestedHospitalName || undefined,
                      requestedRoomType: kypSubmission.preAuthData.requestedRoomType || undefined,
                      diseaseDescription: kypSubmission.preAuthData.diseaseDescription || kypSubmission.disease || undefined,
                      diseaseImages: kypSubmission.preAuthData.diseaseImages as Array<{ name: string; url: string }> | undefined,
                      hospitalSuggestions: kypSubmission.preAuthData.hospitalSuggestions ?? undefined,
                      roomTypes: kypSubmission.preAuthData.roomTypes ?? undefined,
                      suggestedHospitals: kypSubmission.preAuthData.suggestedHospitals ?? undefined,
                    } : undefined}
                    onSuccess={() => {
                      setShowPreAuthRaiseForm(false)
                      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
                      queryClient.invalidateQueries({ queryKey: ['kyp-submission', leadId] })
                    }}
                    onCancel={() => setShowPreAuthRaiseForm(false)}
                  />
                </CardContent>
              </Card>
            ) : lead.kypSubmission?.preAuthData ? (
              <PreAuthDetailsView
                preAuthData={lead.kypSubmission.preAuthData}
                caseStage={lead.caseStage}
                leadRef={lead.leadRef}
                patientName={lead.patientName}
              />
            ) : canRaise ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No pre-auth request yet</p>
                  <Button onClick={() => setShowPreAuthRaiseForm(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Raise Pre-Auth
                  </Button>
                </CardContent>
              </Card>
            ) : canAddDetails ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Add KYP details (hospitals, room types, TPA)</p>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Add KYP Details →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : canComplete ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">BD has raised pre-auth. Review and complete.</p>
                  <Button asChild>
                    <Link href={`/patient/${leadId}/pre-auth`}>
                      Complete Pre-Auth →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {lead.caseStage === CaseStage.PREAUTH_COMPLETE
                    ? 'Pre-authorization completed'
                    : 'Pre-authorization pending'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {lead.kypSubmission?.followUpData && kypSubmission?.followUpData && (
            <TabsContent value="follow-up">
              <FollowUpDetailsView followUpData={kypSubmission.followUpData} />
            </TabsContent>
          )}

          {lead.dischargeSheet && (
            <TabsContent value="discharge">
              <Link href={`/patient/${leadId}/discharge`}>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                  <CardHeader>
                    <CardTitle>Discharge Sheet</CardTitle>
                    <CardDescription>Patient discharge information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">View Details</Button>
                  </CardContent>
                </Card>
              </Link>
            </TabsContent>
          )}
        </Tabs>

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
