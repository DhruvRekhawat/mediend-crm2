import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerAuditAction, LedgerStatus, TransactionType } from '@prisma/client'
import { reverseBalanceUpdate } from '@/lib/finance'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only ADMIN or MD can delete ledger entries
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only Admin/MD can delete ledger entries', 403)
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return errorResponse('Deletion reason is required', 400)
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        party: true,
        head: true,
        paymentMode: true,
        fromPaymentMode: true,
        toPaymentMode: true,
      },
    })

    if (!entry) {
      return errorResponse('Ledger entry not found', 404)
    }

    if (entry.isDeleted) {
      return errorResponse('Ledger entry is already deleted', 400)
    }

    // Soft delete the entry
    const deletedEntry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: user.id,
        deletedReason: reason.trim(),
      },
      include: {
        party: true,
        head: true,
        paymentType: true,
        paymentMode: true,
        deletedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Reverse balance updates for approved entries
    if (entry.status === LedgerStatus.APPROVED) {
      if (entry.transactionType === TransactionType.CREDIT) {
        // Reverse credit: decrease balance
        const amount = entry.receivedAmount || 0
        await reverseBalanceUpdate(entry.paymentModeId!, TransactionType.CREDIT, amount)
      } else if (entry.transactionType === TransactionType.DEBIT) {
        // Reverse debit: increase balance
        const amount = entry.paymentAmount || 0
        await reverseBalanceUpdate(entry.paymentModeId!, TransactionType.DEBIT, amount)
      } else if (entry.transactionType === TransactionType.SELF_TRANSFER) {
        // Reverse self-transfer: reverse both sides
        const amount = entry.transferAmount || 0
        await reverseBalanceUpdate(entry.fromPaymentModeId!, TransactionType.DEBIT, amount)
        await reverseBalanceUpdate(entry.toPaymentModeId!, TransactionType.CREDIT, amount)
      }
    }

    // Create audit log
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.DELETED,
        previousData: {
          isDeleted: false,
          status: entry.status,
          serialNumber: entry.serialNumber,
        },
        newData: {
          isDeleted: true,
          deletedAt: deletedEntry.deletedAt,
          deletedReason: reason.trim(),
        },
        reason: reason.trim(),
        performedById: user.id,
      },
    })

    return successResponse(deletedEntry, 'Ledger entry deleted successfully')
  } catch (error) {
    console.error('Error deleting ledger entry:', error)
    return errorResponse('Failed to delete ledger entry', 500)
  }
}

