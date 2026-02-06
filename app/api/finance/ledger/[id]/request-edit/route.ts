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

    // Only finance team can request edits
    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Only finance team can request edits', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { reason, changes } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return errorResponse('Edit reason is required', 400)
    }

    if (!changes || typeof changes !== 'object') {
      return errorResponse('Changes data is required', 400)
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        party: true,
        head: true,
        paymentType: true,
        paymentMode: true,
      },
    })

    if (!entry) {
      return errorResponse('Ledger entry not found', 404)
    }

    if (entry.isDeleted) {
      return errorResponse('Cannot request edit for deleted entry', 400)
    }

    // Only block if there's a pending edit request - allow new requests if previous was rejected
    if (entry.editRequestStatus === LedgerStatus.PENDING) {
      return errorResponse('An edit request is already pending for this entry', 400)
    }

    // Validate that entry is approved before requesting edit
    if (entry.status !== LedgerStatus.APPROVED) {
      return errorResponse('Can only request edits for approved entries', 400)
    }

    // Check edit count limit
    if (entry.editCount >= 5) {
      return errorResponse('Maximum of 5 edits reached for this entry', 400)
    }

    // Validate changes - allow editing most fields except ID
    const allowedFields = [
      'description', 'transactionDate', 'partyId', 'headId', 'paymentTypeId',
      'transactionType', 'paymentAmount', 'componentA', 'componentB',
      'receivedAmount', 'transferAmount', 'paymentModeId',
      'fromPaymentModeId', 'toPaymentModeId'
    ]
    const changeKeys = Object.keys(changes)
    const invalidFields = changeKeys.filter(key => !allowedFields.includes(key))
    
    if (invalidFields.length > 0) {
      return errorResponse(`Cannot edit fields: ${invalidFields.join(', ')}`, 400)
    }

    // Validate party if changed
    if (changes.partyId && changes.partyId !== entry.partyId) {
      const party = await prisma.partyMaster.findUnique({
        where: { id: changes.partyId },
      })
      if (!party || !party.isActive) {
        return errorResponse('Invalid or inactive party', 400)
      }
    }

    // Validate head if changed
    if (changes.headId && changes.headId !== entry.headId) {
      const head = await prisma.headMaster.findUnique({
        where: { id: changes.headId },
      })
      if (!head || !head.isActive) {
        return errorResponse('Invalid or inactive head', 400)
      }
    }

    // Validate payment type if changed
    if (changes.paymentTypeId && changes.paymentTypeId !== entry.paymentTypeId) {
      const paymentType = await prisma.paymentTypeMaster.findUnique({
        where: { id: changes.paymentTypeId },
      })
      if (!paymentType || !paymentType.isActive) {
        return errorResponse('Invalid or inactive payment type', 400)
      }
    }

    // Validate payment mode if changed
    if (changes.paymentModeId && changes.paymentModeId !== entry.paymentModeId) {
      const paymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.paymentModeId },
      })
      if (!paymentMode || !paymentMode.isActive) {
        return errorResponse('Invalid or inactive payment mode', 400)
      }
    }

    // Validate from payment mode if changed (for SELF_TRANSFER)
    if (changes.fromPaymentModeId && changes.fromPaymentModeId !== entry.fromPaymentModeId) {
      const fromPaymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.fromPaymentModeId },
      })
      if (!fromPaymentMode || !fromPaymentMode.isActive) {
        return errorResponse('Invalid or inactive from payment mode', 400)
      }
    }

    // Validate to payment mode if changed (for SELF_TRANSFER)
    if (changes.toPaymentModeId && changes.toPaymentModeId !== entry.toPaymentModeId) {
      const toPaymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.toPaymentModeId },
      })
      if (!toPaymentMode || !toPaymentMode.isActive) {
        return errorResponse('Invalid or inactive to payment mode', 400)
      }
    }

    // Create edit request
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        editRequestStatus: LedgerStatus.PENDING,
        editRequestReason: reason.trim(),
        editRequestData: changes,
        editRequestedById: user.id,
        editRequestedAt: new Date(),
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

    // Create audit log
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.EDIT_REQUESTED,
        previousData: {
          description: entry.description,
          transactionDate: entry.transactionDate,
          partyId: entry.partyId,
          headId: entry.headId,
          paymentTypeId: entry.paymentTypeId,
        },
        newData: changes,
        reason: reason.trim(),
        performedById: user.id,
      },
    })

    return successResponse(updatedEntry, 'Edit request submitted successfully')
  } catch (error) {
    console.error('Error requesting edit:', error)
    return errorResponse('Failed to request edit', 500)
  }
}

