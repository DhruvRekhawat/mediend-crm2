import { TransactionType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const SERIAL_PREFIX: Record<TransactionType, string> = {
  CREDIT: 'CR',
  DEBIT: 'DR',
  SELF_TRANSFER: 'ST',
} as const

/**
 * Generate the next serial number for a ledger entry
 * Format: CR-0001 for credits, DR-0001 for debits, ST-0001 for self transfers
 */
export async function generateSerialNumber(transactionType: TransactionType): Promise<string> {
  const prefix = SERIAL_PREFIX[transactionType]
  
  // Find the highest existing serial number for this transaction type
  const lastEntry = await prisma.ledgerEntry.findFirst({
    where: {
      transactionType,
    },
    orderBy: {
      serialNumber: 'desc',
    },
    select: {
      serialNumber: true,
    },
  })

  let nextNumber = 1
  
  if (lastEntry?.serialNumber) {
    // Extract the number part from the serial (e.g., "CR-0042" -> 42)
    const match = lastEntry.serialNumber.match(/\d+$/)
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1
    }
  }

  // Pad the number to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, '0')
  
  return `${prefix}-${paddedNumber}`
}

/**
 * Parse a serial number to get its components
 */
export function parseSerialNumber(serialNumber: string): {
  type: TransactionType | null
  number: number
} {
  const match = serialNumber.match(/^(CR|DR)-(\d+)$/)
  
  if (!match) {
    return { type: null, number: 0 }
  }

  const [, prefix, numberStr] = match
  const type = prefix === 'CR' ? TransactionType.CREDIT : TransactionType.DEBIT
  const number = parseInt(numberStr, 10)

  return { type, number }
}

/**
 * Validate a serial number format
 */
export function isValidSerialNumber(serialNumber: string): boolean {
  return /^(CR|DR)-\d{4,}$/.test(serialNumber)
}

