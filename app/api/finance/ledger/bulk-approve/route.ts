import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, TransactionType, LedgerAuditAction } from '@prisma/client'
import { updatePaymentModeBalance, getPaymentModeBalance } from '@/lib/finance'

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD can approve debits (finance:approve permission)
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only MD can approve debit transactions', 403)
    }

    const body = await request.json()
    const { ids, action, rejectionReason } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('IDs array is required and must not be empty', 400)
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return errorResponse('Invalid action. Must be "approve" or "reject"', 400)
    }

    if (action === 'reject' && (!rejectionReason || rejectionReason.trim() === '')) {
      return errorResponse('Rejection reason is required', 400)
    }

    // Fetch all entries
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        id: { in: ids },
        status: LedgerStatus.PENDING,
        transactionType: TransactionType.DEBIT,
      },
      include: {
        party: true,
        head: true,
        paymentMode: true,
      },
    })

    if (entries.length === 0) {
      return errorResponse('No valid pending debit entries found', 404)
    }

    if (entries.length !== ids.length) {
      return errorResponse('Some entries are not pending or not found', 400)
    }

    const results = {
      approved: 0,
      rejected: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Process each entry
    for (const entry of entries) {
      try {
        if (action === 'reject') {
          // Reject the entry - NO balance change
          await prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              status: LedgerStatus.REJECTED,
              rejectionReason: rejectionReason.trim(),
              approvedById: user.id,
              approvedAt: new Date(),
            },
          })

          // Create audit log
          await prisma.ledgerAuditLog.create({
            data: {
              ledgerEntryId: entry.id,
              action: LedgerAuditAction.REJECTED,
              previousData: { status: LedgerStatus.PENDING },
              newData: { status: LedgerStatus.REJECTED },
              reason: rejectionReason.trim(),
              performedById: user.id,
            },
          })

          results.rejected++
        } else {
          // Approve the entry
          const amount = entry.paymentAmount || 0

          if (!entry.paymentModeId) {
            throw new Error(`Payment mode is required for entry ${entry.serialNumber}`)
          }

          // Get current balance and update it
          const balanceBefore = await getPaymentModeBalance(entry.paymentModeId)
          const newBalance = await updatePaymentModeBalance(
            entry.paymentModeId,
            TransactionType.DEBIT,
            amount
          )

          // Update the entry with approval and new balance
          await prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              status: LedgerStatus.APPROVED,
              currentBalance: newBalance,
              approvedById: user.id,
              approvedAt: new Date(),
            },
          })

          // Create audit log
          await prisma.ledgerAuditLog.create({
            data: {
              ledgerEntryId: entry.id,
              action: LedgerAuditAction.APPROVED,
              previousData: {
                status: LedgerStatus.PENDING,
                balanceBefore,
              },
              newData: {
                status: LedgerStatus.APPROVED,
                balanceAfter: newBalance,
                amountDeducted: amount,
              },
              performedById: user.id,
            },
          })

          results.approved++
        }
      } catch (error) {
        results.failed++
        results.errors.push(
          `Failed to process ${entry.serialNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    const message =
      action === 'approve'
        ? `${results.approved} entries approved successfully`
        : `${results.rejected} entries rejected successfully`

    const successMessage =
      results.failed > 0
        ? `${message}. ${results.failed} failed.`
        : message

    return successResponse(results, successMessage)
  } catch (error) {
    console.error('Error in bulk approval:', error)
    return errorResponse('Failed to process bulk approval', 500)
  }
}
