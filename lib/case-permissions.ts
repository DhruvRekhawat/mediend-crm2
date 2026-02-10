import { CaseStage } from '@prisma/client'
import { SessionUser } from './auth'

interface LeadWithCaseStage {
  caseStage?: CaseStage
}

export function canEditFinancials(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // BD cannot edit after INITIATED
  if (user.role === 'BD' && (lead.caseStage === CaseStage.INITIATED || lead.caseStage === CaseStage.ADMITTED || lead.caseStage === CaseStage.DISCHARGED)) {
    return false
  }
  // Insurance can always edit
  if (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') {
    return true
  }
  return false
}

export function canRaisePreAuth(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // BD can raise pre-auth after KYP Detailed submitted or (legacy) after Insurance added KYP details
  return (user.role === 'BD' || user.role === 'ADMIN') &&
         (lead.caseStage === CaseStage.KYP_DETAILED_PENDING ||
          lead.caseStage === CaseStage.KYP_DETAILED_COMPLETE ||
          lead.caseStage === CaseStage.KYP_COMPLETE)
}

/** Insurance can add KYP details (hospitals, room types, TPA, etc.) when KYP basic is pending. */
export function canAddKYPDetails(user: SessionUser, lead: LeadWithCaseStage): boolean {
  return (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') &&
         (lead.caseStage === CaseStage.KYP_BASIC_PENDING || lead.caseStage === CaseStage.KYP_PENDING)
}

/** BD can submit KYP (Detailed) when Insurance has suggested hospitals (KYP_BASIC_COMPLETE). */
export function canSubmitKYPDetailed(user: SessionUser, lead: LeadWithCaseStage): boolean {
  return (user.role === 'BD' || user.role === 'ADMIN') &&
         lead.caseStage === CaseStage.KYP_BASIC_COMPLETE
}

/** Insurance can complete pre-auth after BD has raised (finalize / PDF). */
export function canCompletePreAuth(user: SessionUser, lead: LeadWithCaseStage): boolean {
  return (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') &&
         lead.caseStage === CaseStage.PREAUTH_RAISED
}

export function canInitiate(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // BD can initiate if pre-auth complete
  return (user.role === 'BD' || user.role === 'ADMIN') && 
         lead.caseStage === CaseStage.PREAUTH_COMPLETE
}

export function canMarkDischarge(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // BD can mark discharge if admitted
  return (user.role === 'BD' || user.role === 'ADMIN') && 
         (lead.caseStage === CaseStage.INITIATED || lead.caseStage === CaseStage.ADMITTED)
}

export function canGeneratePDF(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // Insurance can generate PDF if pre-auth is complete
  return (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') && 
         lead.caseStage === CaseStage.PREAUTH_COMPLETE
}

export function canViewStageHistory(user: SessionUser): boolean {
  // All authenticated users can view stage history
  return true
}

export function canEditKYP(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // BD can edit KYP until it's complete (support new and legacy stage names)
  const lockedStages: CaseStage[] = [
    CaseStage.KYP_DETAILED_COMPLETE, CaseStage.KYP_COMPLETE,
    CaseStage.PREAUTH_RAISED, CaseStage.PREAUTH_COMPLETE,
    CaseStage.INITIATED, CaseStage.ADMITTED, CaseStage.DISCHARGED,
  ]
  return (user.role === 'BD' || user.role === 'ADMIN') &&
         lead.caseStage != null &&
         !lockedStages.includes(lead.caseStage)
}

export function canEditDischargeSheet(user: SessionUser, lead: LeadWithCaseStage): boolean {
  // Insurance can edit discharge sheet after discharge
  return (user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN') &&
         lead.caseStage === CaseStage.DISCHARGED
}

/** BD can mark case lost from pre-auth complete onward (and not already LOST). */
export function canMarkLost(
  user: SessionUser,
  lead: LeadWithCaseStage & { pipelineStage?: string }
): boolean {
  if (lead.pipelineStage === 'LOST') return false
  const allowedStages: CaseStage[] = [
    CaseStage.PREAUTH_COMPLETE,
    CaseStage.INITIATED,
    CaseStage.ADMITTED,
    CaseStage.DISCHARGED,
    CaseStage.PL_PENDING,
    CaseStage.OUTSTANDING,
  ]
  return (user.role === 'BD' || user.role === 'ADMIN') &&
         lead.caseStage != null &&
         allowedStages.includes(lead.caseStage)
}
