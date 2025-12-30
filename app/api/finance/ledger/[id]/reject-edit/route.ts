import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, LedgerAuditAction } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only ADMIN or MD can reject edit requests
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only Admin/MD can reject edit requests', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return errorResponse('Rejection reason is required', 400)
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
    })

    if (!entry) {
      return errorResponse('Ledger entry not found', 404)
    }

    if (entry.isDeleted) {
      return errorResponse('Cannot reject edit for deleted entry', 400)
    }

    if (entry.editRequestStatus !== LedgerStatus.PENDING) {
      return errorResponse('No pending edit request found', 400)
    }

    // Reject the edit request
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        editRequestStatus: LedgerStatus.REJECTED,
        editApprovalReason: reason.trim(),
        editApprovedById: user.id,
        editApprovedAt: new Date(),
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
        editApprovedBy: {
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
        action: LedgerAuditAction.EDIT_REJECTED,
        previousData: {
          editRequestStatus: LedgerStatus.PENDING,
        },
        newData: {
          editRequestStatus: LedgerStatus.REJECTED,
          editApprovalReason: reason.trim(),
        },
        reason: reason.trim(),
        performedById: user.id,
      },
    })

    return successResponse(updatedEntry, 'Edit request rejected')
  } catch (error) {
    console.error('Error rejecting edit request:', error)
    return errorResponse('Failed to reject edit request', 500)
  }
}

