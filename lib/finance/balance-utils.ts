import { TransactionType, LedgerStatus, PrismaClient } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Calculate the new balance after a transaction
 */
export function calculateNewBalance(
  currentBalance: number,
  transactionType: TransactionType,
  amount: number
): number {
  if (transactionType === TransactionType.CREDIT) {
    return currentBalance + amount
  } else {
    return currentBalance - amount
  }
}

/**
 * Get the current balance for a payment mode
 */
export async function getPaymentModeBalance(
  paymentModeId: string,
  tx: PrismaTransactionClient = prisma
): Promise<number> {
  const paymentMode = await tx.paymentModeMaster.findUnique({
    where: { id: paymentModeId },
    select: { currentBalance: true },
  })

  return paymentMode?.currentBalance ?? 0
}

/**
 * Update the payment mode balance after an approved transaction
 * This should only be called when a transaction is approved
 */
export async function updatePaymentModeBalance(
  paymentModeId: string,
  transactionType: TransactionType,
  amount: number,
  tx: PrismaTransactionClient = prisma
): Promise<number> {
  const increment = transactionType === TransactionType.CREDIT ? amount : -amount

  const updated = await tx.paymentModeMaster.update({
    where: { id: paymentModeId },
    data: {
      currentBalance: {
        increment,
      },
    },
    select: { currentBalance: true },
  })

  return updated.currentBalance
}

/**
 * Reverse a balance update (used when a transaction is reversed or deleted)
 */
export async function reverseBalanceUpdate(
  paymentModeId: string,
  transactionType: TransactionType,
  amount: number,
  tx: PrismaTransactionClient = prisma
): Promise<number> {
  const increment = transactionType === TransactionType.CREDIT ? -amount : amount

  const updated = await tx.paymentModeMaster.update({
    where: { id: paymentModeId },
    data: {
      currentBalance: {
        increment,
      },
    },
    select: { currentBalance: true },
  })

  return updated.currentBalance
}

/**
 * Calculate balance impact preview (without actually updating)
 */
export async function previewBalanceImpact(
  paymentModeId: string,
  transactionType: TransactionType,
  amount: number
): Promise<{
  currentBalance: number
  projectedBalance: number
  impact: number
}> {
  const currentBalance = await getPaymentModeBalance(paymentModeId)
  const impact = transactionType === TransactionType.CREDIT ? amount : -amount
  const projectedBalance = currentBalance + impact

  return {
    currentBalance,
    projectedBalance,
    impact,
  }
}

/**
 * Get totals for a payment mode (all approved, non-deleted transactions)
 * Includes self-transfers where this mode is the source (debit) or destination (credit)
 */
export async function getPaymentModeTotals(paymentModeId: string): Promise<{
  totalCredits: number
  totalDebits: number
  netChange: number
}> {
  const [credits, debits, selfTransferOut, selfTransferIn] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: {
        paymentModeId,
        transactionType: TransactionType.CREDIT,
        status: LedgerStatus.APPROVED,
        isDeleted: false,
      },
      _sum: {
        receivedAmount: true,
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        paymentModeId,
        transactionType: TransactionType.DEBIT,
        status: LedgerStatus.APPROVED,
        isDeleted: false,
      },
      _sum: {
        paymentAmount: true,
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        fromPaymentModeId: paymentModeId,
        transactionType: TransactionType.SELF_TRANSFER,
        status: LedgerStatus.APPROVED,
        isDeleted: false,
      },
      _sum: {
        transferAmount: true,
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        toPaymentModeId: paymentModeId,
        transactionType: TransactionType.SELF_TRANSFER,
        status: LedgerStatus.APPROVED,
        isDeleted: false,
      },
      _sum: {
        transferAmount: true,
      },
    }),
  ])

  const totalCredits = (credits._sum.receivedAmount ?? 0) + (selfTransferIn._sum.transferAmount ?? 0)
  const totalDebits = (debits._sum.paymentAmount ?? 0) + (selfTransferOut._sum.transferAmount ?? 0)
  const netChange = totalCredits - totalDebits

  return { totalCredits, totalDebits, netChange }
}

/**
 * Verify balance integrity for a payment mode
 * Returns true if the current balance matches expected balance from transactions
 */
export async function verifyBalanceIntegrity(paymentModeId: string): Promise<{
  isValid: boolean
  currentBalance: number
  expectedBalance: number
  discrepancy: number
}> {
  const paymentMode = await prisma.paymentModeMaster.findUnique({
    where: { id: paymentModeId },
    select: { openingBalance: true, currentBalance: true },
  })

  if (!paymentMode) {
    throw new Error('Payment mode not found')
  }

  const { totalCredits, totalDebits } = await getPaymentModeTotals(paymentModeId)
  const expectedBalance = paymentMode.openingBalance + totalCredits - totalDebits
  const discrepancy = paymentMode.currentBalance - expectedBalance

  return {
    isValid: Math.abs(discrepancy) < 0.01, // Allow for floating point precision
    currentBalance: paymentMode.currentBalance,
    expectedBalance,
    discrepancy,
  }
}

