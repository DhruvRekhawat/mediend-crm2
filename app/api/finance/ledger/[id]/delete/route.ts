import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerAuditAction } from '@prisma/client'

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

