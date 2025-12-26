import { 
  TransactionType, 
  LedgerStatus, 
  PartyType, 
  FinancePaymentType,
  LedgerAuditAction 
} from '@prisma/client'

// Re-export Prisma types for convenience
export { 
  TransactionType, 
  LedgerStatus, 
  PartyType, 
  FinancePaymentType,
  LedgerAuditAction 
}

// Ledger Entry form data
export interface LedgerEntryFormData {
  transactionType: TransactionType
  transactionDate: Date
  partyId: string
  description: string
  headId: string
  paymentTypeId: string
  paymentAmount?: number
  receivedAmount?: number
  paymentModeId: string
}

// Ledger Entry with relations
export interface LedgerEntryWithRelations {
  id: string
  serialNumber: string
  transactionType: TransactionType
  transactionDate: Date
  description: string
  paymentAmount: number | null
  receivedAmount: number | null
  openingBalance: number
  currentBalance: number
  status: LedgerStatus
  rejectionReason: string | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
  party: {
    id: string
    name: string
    partyType: PartyType
  }
  head: {
    id: string
    name: string
    department: string | null
  }
  paymentType: {
    id: string
    name: string
    paymentType: FinancePaymentType
  }
  paymentMode: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  approvedBy: {
    id: string
    name: string
    email: string
  } | null
}

// Party Master
export interface PartyMasterData {
  id: string
  name: string
  partyType: PartyType
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  gstNumber: string | null
  panNumber: string | null
  address: string | null
  isActive: boolean
}

// Head Master
export interface HeadMasterData {
  id: string
  name: string
  department: string | null
  description: string | null
  isActive: boolean
}

// Payment Type Master
export interface PaymentTypeMasterData {
  id: string
  name: string
  paymentType: FinancePaymentType
  description: string | null
  isActive: boolean
}

// Payment Mode Master with balance
export interface PaymentModeMasterData {
  id: string
  name: string
  description: string | null
  openingBalance: number
  currentBalance: number
  isActive: boolean
}

// Report summaries
export interface PaymentModeBalanceSummary {
  id: string
  name: string
  openingBalance: number
  currentBalance: number
  totalCredits: number
  totalDebits: number
}

export interface DayWiseLedgerSummary {
  date: string
  totalCredits: number
  totalDebits: number
  netChange: number
  entriesCount: number
}

export interface PartyWiseLedgerSummary {
  partyId: string
  partyName: string
  partyType: PartyType
  totalCredits: number
  totalDebits: number
  netAmount: number
  entriesCount: number
}

export interface HeadWiseSummary {
  headId: string
  headName: string
  department: string | null
  totalCredits: number
  totalDebits: number
  netAmount: number
  entriesCount: number
}

// Audit log entry
export interface LedgerAuditLogEntry {
  id: string
  action: LedgerAuditAction
  previousData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  reason: string | null
  performedAt: Date
  performedBy: {
    id: string
    name: string
    email: string
  }
}

