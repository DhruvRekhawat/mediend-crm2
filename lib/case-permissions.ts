import { CaseStage } from '@prisma/client'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'BD' | 'INSURANCE' | 'INSURANCE_HEAD' | 'PL_HEAD' | 'OUTSTANDING_HEAD' | 'PL_ENTRY' | 'PL_VIEWER' | 'ACCOUNTS' | 'HR' | 'MD' | 'TRAINEE' | 'TEAM_LEAD'
}

interface Lead {
  id: string
  caseStage: CaseStage
  pipelineStage: string
  kypSubmission?: {
    id: string
    status: string
  } | null
  dischargeSheet?: {
    id: string
  } | null
}

// BD (or Team Lead) can raise pre-auth when case is in KYP detailed complete or pending stage
export function canRaisePreAuth(user: User, lead: Lead): boolean {
  if (!user || !lead) return false

  const isBDOrTeamLead = user.role === 'BD' || user.role === 'TEAM_LEAD' || user.role === 'ADMIN'
  const canRaiseStage =
    lead.caseStage === CaseStage.KYP_DETAILED_COMPLETE ||
    lead.caseStage === CaseStage.KYP_DETAILED_PENDING

  return isBDOrTeamLead && canRaiseStage
}

// BD can submit detailed KYP when case is in basic complete stage
export function canSubmitKYPDetailed(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isBD = user.role === 'BD' || user.role === 'ADMIN'
  const isKYPBasicComplete = lead.caseStage === CaseStage.KYP_BASIC_COMPLETE
  
  return isBD && isKYPBasicComplete
}

// Insurance can add KYP details when case is in basic complete stage
export function canAddKYPDetails(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isInsurance = ['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)
  const isKYPBasicComplete = lead.caseStage === CaseStage.KYP_BASIC_COMPLETE
  
  return isInsurance && isKYPBasicComplete
}

// Insurance can complete pre-auth when it's raised
export function canCompletePreAuth(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isInsurance = ['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)
  const isPreAuthRaised = lead.caseStage === CaseStage.PREAUTH_RAISED
  
  return isInsurance && isPreAuthRaised
}

// BD can edit KYP when it's in pending or complete states
export function canEditKYP(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isBD = user.role === 'BD' || user.role === 'ADMIN'
  const canEditStages: CaseStage[] = [
    CaseStage.KYP_BASIC_PENDING,
    CaseStage.KYP_BASIC_COMPLETE,
    CaseStage.KYP_DETAILED_PENDING,
    CaseStage.KYP_DETAILED_COMPLETE
  ]
  
  return isBD && canEditStages.includes(lead.caseStage)
}

// BD can mark admitted when pre-auth is complete
export function canInitiate(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isBD = user.role === 'BD' || user.role === 'ADMIN'
  const isPreAuthComplete = lead.caseStage === CaseStage.PREAUTH_COMPLETE
  
  return isBD && isPreAuthComplete
}

// BD can mark discharged when initiated
export function canMarkDischarge(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isBD = user.role === 'BD' || user.role === 'ADMIN'
  const isInitiated = lead.caseStage === CaseStage.INITIATED
  
  return isBD && isInitiated
}

// Insurance can generate/download PDF after pre-auth is raised
export function canGeneratePDF(user: User, lead: Lead): boolean {
  if (!user || !lead) return false

  const isInsurance = ['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)
  const afterPreAuthRaised =
    lead.caseStage === CaseStage.PREAUTH_RAISED || lead.caseStage === CaseStage.PREAUTH_COMPLETE

  return isInsurance && afterPreAuthRaised
}

// Insurance or PL can edit discharge sheet when discharged
export function canEditDischargeSheet(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  
  const isInsuranceOrPL = ['INSURANCE', 'INSURANCE_HEAD', 'PL_HEAD', 'PL_ENTRY', 'ADMIN'].includes(user.role)
  const isDischarged = lead.caseStage === CaseStage.DISCHARGED
  
  return isInsuranceOrPL && isDischarged
}

// BD can mark case as lost only after KYP1 and up until Mark Admitted (not before KYP1, not after admitted)
export function canMarkLost(user: User, lead: Lead): boolean {
  if (!user || !lead) return false

  const isBD = user.role === 'BD' || user.role === 'ADMIN'
  if (!isBD) return false

  // Not allowed: before KYP1 (basic complete) or after admission
  const beforeKYP1: CaseStage[] = [CaseStage.NEW_LEAD, CaseStage.KYP_BASIC_PENDING]
  const afterAdmission: CaseStage[] = [
    CaseStage.INITIATED,
    CaseStage.ADMITTED,
    CaseStage.DISCHARGED,
    CaseStage.IPD_DONE,
    CaseStage.PL_PENDING,
    CaseStage.OUTSTANDING,
  ]
  if (beforeKYP1.includes(lead.caseStage) || afterAdmission.includes(lead.caseStage)) {
    return false
  }

  // Allowed: after KYP1 up until (and including) pre-auth complete, before Mark Admitted
  const allowedStages: CaseStage[] = [
    CaseStage.KYP_BASIC_COMPLETE,
    CaseStage.KYP_DETAILED_PENDING,
    CaseStage.KYP_DETAILED_COMPLETE,
    CaseStage.PREAUTH_RAISED,
    CaseStage.PREAUTH_COMPLETE,
    CaseStage.KYP_PENDING,
    CaseStage.KYP_COMPLETE,
  ]
  return allowedStages.includes(lead.caseStage)
}

// Insurance can suggest hospitals when BD has submitted KYP Basic (KYP_BASIC_PENDING)
export function canSuggestHospitals(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  const isInsurance = ['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)
  return isInsurance && lead.caseStage === CaseStage.KYP_BASIC_PENDING
}

// Insurance can access insurance actions (pre-auth page) after KYP basic is submitted (pending or later)
export function canShowInsuranceActions(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  const isInsurance = ['INSURANCE', 'INSURANCE_HEAD', 'ADMIN'].includes(user.role)
  const canAccessStages: CaseStage[] = [
    CaseStage.KYP_BASIC_PENDING, // suggest hospitals
    CaseStage.KYP_BASIC_COMPLETE,
    CaseStage.KYP_DETAILED_PENDING,
    CaseStage.KYP_DETAILED_COMPLETE,
    CaseStage.PREAUTH_RAISED,
    CaseStage.PREAUTH_COMPLETE,
    CaseStage.INITIATED,
    CaseStage.ADMITTED,
    CaseStage.DISCHARGED,
    CaseStage.IPD_DONE,
    CaseStage.PL_PENDING,
    CaseStage.OUTSTANDING,
    CaseStage.KYP_PENDING,
    CaseStage.KYP_COMPLETE,
  ]
  return isInsurance && canAccessStages.includes(lead.caseStage)
}

// Outstanding Head can edit payout statuses and pending amounts only when discharge sheet exists
export function canEditOutstanding(user: User, lead: Lead): boolean {
  if (!user || !lead) return false
  const isOutstandingHead = ['OUTSTANDING_HEAD', 'ADMIN'].includes(user.role)
  const hasDischargeSheet = !!lead.dischargeSheet
  return isOutstandingHead && hasDischargeSheet
}

// Only INSURANCE_HEAD and ADMIN can view patient phone numbers
export function canViewPhoneNumber(user: { role: string } | null | undefined): boolean {
  if (!user) return false
  return ['INSURANCE_HEAD', 'ADMIN'].includes(user.role)
}