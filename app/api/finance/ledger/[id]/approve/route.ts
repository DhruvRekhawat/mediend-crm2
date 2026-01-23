import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, TransactionType, LedgerAuditAction } from '@prisma/client'
import { updatePaymentModeBalance, getPaymentModeBalance } from '@/lib/finance'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only MD can approve debits (finance:approve permission)
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only MD can approve debit transactions', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectionReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return errorResponse('Invalid action. Must be "approve" or "reject"', 400)
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        party: true,
        head: true,
        paymentMode: true,
      },
    })

    if (!entry) {
      return errorResponse('Ledger entry not found', 404)
    }

    // Can only approve/reject PENDING debit entries
    if (entry.status !== LedgerStatus.PENDING) {
      return errorResponse('Can only approve/reject pending entries', 400)
    }

    // This endpoint is primarily for debits, but handle both for safety
    if (entry.transactionType !== TransactionType.DEBIT) {
      return errorResponse('Credit entries are auto-approved', 400)
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim() === '') {
        return errorResponse('Rejection reason is required', 400)
      }

      // Reject the entry - NO balance change
      const updatedEntry = await prisma.ledgerEntry.update({
        where: { id },
        data: {
          status: LedgerStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
          approvedById: user.id,
          approvedAt: new Date(),
        },
        include: {
          party: true,
          head: true,
          paymentType: true,
          paymentMode: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Create audit log
      await prisma.ledgerAuditLog.create({
        data: {
          ledgerEntryId: id,
          action: LedgerAuditAction.REJECTED,
          previousData: { status: LedgerStatus.PENDING },
          newData: { status: LedgerStatus.REJECTED },
          reason: rejectionReason.trim(),
          performedById: user.id,
        },
      })

      return successResponse(updatedEntry, 'Debit entry rejected')
    }

    // Approve the entry
    const amount = entry.paymentAmount || 0

    // Validate payment mode exists
    if (!entry.paymentModeId) {
      return errorResponse('Payment mode is required for debit transactions', 400)
    }

    // Get current balance and update it
    const balanceBefore = await getPaymentModeBalance(entry.paymentModeId)
    const newBalance = await updatePaymentModeBalance(
      entry.paymentModeId,
      TransactionType.DEBIT,
      amount
    )

    // Update the entry with approval and new balance
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        status: LedgerStatus.APPROVED,
        currentBalance: newBalance,
        approvedById: user.id,
        approvedAt: new Date(),
      },
      include: {
        party: true,
        head: true,
        paymentType: true,
        paymentMode: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: id,
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

    return successResponse(updatedEntry, 'Debit entry approved and balance updated')
  } catch (error) {
    console.error('Error approving/rejecting ledger entry:', error)
    return errorResponse('Failed to process approval', 500)
  }
}

