import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, TransactionType, LedgerAuditAction } from '@prisma/client'
import { reverseBalanceUpdate } from '@/lib/finance'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

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

    if (entry.isDeleted) {
      return errorResponse('Cannot undo deleted entry', 400)
    }

    // Determine undo type and validate

    // Debit approval undo
    if (entry.status === LedgerStatus.APPROVED && entry.approvedById === user.id && entry.approvedAt && entry.transactionType === TransactionType.DEBIT) {

      const amount = entry.paymentAmount || 0
      if (!entry.paymentModeId) {
        return errorResponse('Payment mode not found', 400)
      }

      // Reverse balance update (add amount back)
      await reverseBalanceUpdate(entry.paymentModeId, TransactionType.DEBIT, amount)

      const updatedEntry = await prisma.ledgerEntry.update({
        where: { id },
        data: {
          status: LedgerStatus.PENDING,
          currentBalance: entry.openingBalance,
          rejectionReason: null,
          approvedById: null,
          approvedAt: null,
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
        },
      })

      await prisma.ledgerAuditLog.create({
        data: {
          ledgerEntryId: id,
          action: LedgerAuditAction.UPDATED,
          previousData: { status: LedgerStatus.APPROVED },
          newData: { status: LedgerStatus.PENDING, reason: 'Undo approval' },
          reason: 'Undo approval - reverted to pending',
          performedById: user.id,
        },
      })

      return successResponse(updatedEntry, 'Approval undone. Entry is back to pending.')
    }

    // Self-transfer approval undo
    if (entry.status === LedgerStatus.APPROVED && entry.approvedById === user.id && entry.approvedAt) {
      if (entry.transactionType !== TransactionType.SELF_TRANSFER) {
        // Skip to next check - this is not a self-transfer
      } else {
        const amount = entry.transferAmount || 0
        if (!entry.fromPaymentModeId || !entry.toPaymentModeId) {
          return errorResponse('Payment modes not found', 400)
        }

        // Reverse balance updates (reverse both sides of the transfer)
        await reverseBalanceUpdate(entry.fromPaymentModeId, TransactionType.DEBIT, amount)
        await reverseBalanceUpdate(entry.toPaymentModeId, TransactionType.CREDIT, amount)

        const updatedEntry = await prisma.ledgerEntry.update({
          where: { id },
          data: {
            status: LedgerStatus.PENDING,
            currentBalance: entry.openingBalance,
            rejectionReason: null,
            approvedById: null,
            approvedAt: null,
          },
          include: {
            party: true,
            head: true,
            paymentType: true,
            paymentMode: true,
            fromPaymentMode: true,
            toPaymentMode: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        await prisma.ledgerAuditLog.create({
          data: {
            ledgerEntryId: id,
            action: LedgerAuditAction.UPDATED,
            previousData: { status: LedgerStatus.APPROVED },
            newData: { status: LedgerStatus.PENDING, reason: 'Undo approval' },
            reason: 'Undo self-transfer approval - reverted to pending',
            performedById: user.id,
          },
        })

        return successResponse(updatedEntry, 'Self-transfer approval undone. Entry is back to pending.')
      }
    }

    // Debit rejection undo
    if (entry.status === LedgerStatus.REJECTED && entry.approvedById === user.id && entry.approvedAt && entry.transactionType === TransactionType.DEBIT) {

      const updatedEntry = await prisma.ledgerEntry.update({
        where: { id },
        data: {
          status: LedgerStatus.PENDING,
          rejectionReason: null,
          approvedById: null,
          approvedAt: null,
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
        },
      })

      await prisma.ledgerAuditLog.create({
        data: {
          ledgerEntryId: id,
          action: LedgerAuditAction.UPDATED,
          previousData: { status: LedgerStatus.REJECTED },
          newData: { status: LedgerStatus.PENDING, reason: 'Undo rejection' },
          reason: 'Undo rejection - reverted to pending',
          performedById: user.id,
        },
      })

      return successResponse(updatedEntry, 'Rejection undone. Entry is back to pending.')
    }

    // Edit approval/rejection undo
    if (
      (entry.editRequestStatus === LedgerStatus.APPROVED || entry.editRequestStatus === LedgerStatus.REJECTED) &&
      entry.editApprovedById === user.id &&
      entry.editApprovedAt
    ) {
      const previousStatus = entry.editRequestStatus

      const updatedEntry = await prisma.ledgerEntry.update({
        where: { id },
        data: {
          editRequestStatus: LedgerStatus.PENDING,
          editApprovalReason: null,
          editApprovedById: null,
          editApprovedAt: null,
        },
        include: {
          party: true,
          head: true,
          paymentType: true,
          paymentMode: true,
          editRequestedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      await prisma.ledgerAuditLog.create({
        data: {
          ledgerEntryId: id,
          action: LedgerAuditAction.UPDATED,
          previousData: { editRequestStatus: previousStatus },
          newData: { editRequestStatus: LedgerStatus.PENDING, reason: 'Undo edit decision' },
          reason: 'Undo edit approval/rejection - reverted to pending',
          performedById: user.id,
        },
      })

      return successResponse(updatedEntry, 'Edit decision undone. Request is back to pending.')
    }

    return errorResponse('Nothing to undo. Entry was not approved or rejected by you.', 400)
  } catch (error) {
    console.error('Error undoing ledger action:', error)
    return errorResponse('Failed to undo', 500)
  }
}
