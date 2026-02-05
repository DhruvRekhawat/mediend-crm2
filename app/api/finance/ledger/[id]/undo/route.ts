import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, TransactionType, LedgerAuditAction } from '@prisma/client'
import { reverseBalanceUpdate } from '@/lib/finance'

const UNDO_WINDOW_MS = 2 * 60 * 1000 // 2 minutes

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
    const now = Date.now()

    // Debit approval undo
    if (entry.status === LedgerStatus.APPROVED && entry.approvedById === user.id && entry.approvedAt) {
      const approvedAtMs = new Date(entry.approvedAt).getTime()
      if (now - approvedAtMs > UNDO_WINDOW_MS) {
        return errorResponse('Undo window expired. You can only undo within 2 minutes.', 400)
      }

      if (entry.transactionType !== TransactionType.DEBIT) {
        return errorResponse('Can only undo debit approvals', 400)
      }

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

    // Debit rejection undo
    if (entry.status === LedgerStatus.REJECTED && entry.approvedById === user.id && entry.approvedAt) {
      const approvedAtMs = new Date(entry.approvedAt).getTime()
      if (now - approvedAtMs > UNDO_WINDOW_MS) {
        return errorResponse('Undo window expired. You can only undo within 2 minutes.', 400)
      }

      if (entry.transactionType !== TransactionType.DEBIT) {
        return errorResponse('Can only undo debit rejections', 400)
      }

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
      const editApprovedAtMs = new Date(entry.editApprovedAt).getTime()
      if (now - editApprovedAtMs > UNDO_WINDOW_MS) {
        return errorResponse('Undo window expired. You can only undo within 2 minutes.', 400)
      }

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

    return errorResponse('Nothing to undo. Entry was not recently approved or rejected by you, or undo window has expired.', 400)
  } catch (error) {
    console.error('Error undoing ledger action:', error)
    return errorResponse('Failed to undo', 500)
  }
}
