import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, LedgerAuditAction, Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only ADMIN or MD can approve edit requests
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only Admin/MD can approve edit requests', 403)
    }

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    // Approval reason is optional - no validation needed

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
      return errorResponse('Cannot approve edit for deleted entry', 400)
    }

    if (entry.editRequestStatus !== LedgerStatus.PENDING) {
      return errorResponse('No pending edit request found', 400)
    }

    if (!entry.editRequestData || typeof entry.editRequestData !== 'object') {
      return errorResponse('No edit data found', 400)
    }

    const changes = entry.editRequestData as Record<string, unknown>

    // Store previous data for audit
    const previousData = {
      description: entry.description,
      transactionDate: entry.transactionDate,
      partyId: entry.partyId,
      headId: entry.headId,
      paymentTypeId: entry.paymentTypeId,
      transactionType: entry.transactionType,
      paymentAmount: entry.paymentAmount,
      componentA: entry.componentA,
      componentB: entry.componentB,
      receivedAmount: entry.receivedAmount,
      transferAmount: entry.transferAmount,
      paymentModeId: entry.paymentModeId,
      fromPaymentModeId: entry.fromPaymentModeId,
      toPaymentModeId: entry.toPaymentModeId,
    }

    // Validate and prepare changes
    const updateData: Record<string, unknown> = {}

    if (changes.description !== undefined) {
      updateData.description = changes.description
    }

    if (changes.transactionDate !== undefined) {
      updateData.transactionDate = new Date(changes.transactionDate as string)
    }

    if (changes.partyId !== undefined && changes.partyId !== entry.partyId) {
      const party = await prisma.partyMaster.findUnique({
        where: { id: changes.partyId as string },
      })
      if (!party || !party.isActive) {
        return errorResponse('Invalid or inactive party', 400)
      }
      updateData.partyId = changes.partyId
    }

    if (changes.headId !== undefined && changes.headId !== entry.headId) {
      const head = await prisma.headMaster.findUnique({
        where: { id: changes.headId as string },
      })
      if (!head || !head.isActive) {
        return errorResponse('Invalid or inactive head', 400)
      }
      updateData.headId = changes.headId
    }

    if (changes.paymentTypeId !== undefined && changes.paymentTypeId !== entry.paymentTypeId) {
      const paymentType = await prisma.paymentTypeMaster.findUnique({
        where: { id: changes.paymentTypeId as string },
      })
      if (!paymentType || !paymentType.isActive) {
        return errorResponse('Invalid or inactive payment type', 400)
      }
      updateData.paymentTypeId = changes.paymentTypeId
    }

    // Handle transaction type change
    if (changes.transactionType !== undefined) {
      updateData.transactionType = changes.transactionType
    }

    // Handle amount changes
    if (changes.paymentAmount !== undefined) {
      updateData.paymentAmount = changes.paymentAmount
    }
    if (changes.componentA !== undefined) {
      updateData.componentA = changes.componentA
    }
    if (changes.componentB !== undefined) {
      updateData.componentB = changes.componentB
    }
    if (changes.receivedAmount !== undefined) {
      updateData.receivedAmount = changes.receivedAmount
    }
    if (changes.transferAmount !== undefined) {
      updateData.transferAmount = changes.transferAmount
    }

    // Handle payment mode changes
    if (changes.paymentModeId !== undefined && changes.paymentModeId !== entry.paymentModeId) {
      const paymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.paymentModeId as string },
      })
      if (!paymentMode || !paymentMode.isActive) {
        return errorResponse('Invalid or inactive payment mode', 400)
      }
      updateData.paymentModeId = changes.paymentModeId
    }

    if (changes.fromPaymentModeId !== undefined && changes.fromPaymentModeId !== entry.fromPaymentModeId) {
      const fromPaymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.fromPaymentModeId as string },
      })
      if (!fromPaymentMode || !fromPaymentMode.isActive) {
        return errorResponse('Invalid or inactive from payment mode', 400)
      }
      updateData.fromPaymentModeId = changes.fromPaymentModeId
    }

    if (changes.toPaymentModeId !== undefined && changes.toPaymentModeId !== entry.toPaymentModeId) {
      const toPaymentMode = await prisma.paymentModeMaster.findUnique({
        where: { id: changes.toPaymentModeId as string },
      })
      if (!toPaymentMode || !toPaymentMode.isActive) {
        return errorResponse('Invalid or inactive to payment mode', 400)
      }
      updateData.toPaymentModeId = changes.toPaymentModeId
    }

    // Note: Balance recalculations for amount/payment mode changes should be handled
    // by a separate background job or manual recalculation process for data integrity

    // Apply the changes, increment editCount, and clear edit request fields
    const updatedEntry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        ...updateData,
        editCount: entry.editCount + 1,
        // Clear edit request fields after applying
        editRequestStatus: null,
        editRequestReason: null,
        editRequestData: Prisma.JsonNull,
        editRequestedById: null,
        editRequestedAt: null,
        editApprovalReason: reason?.trim() || null,
        editApprovedById: user.id,
        editApprovedAt: new Date(),
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

    // Create audit log for approval
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.EDIT_APPROVED,
        previousData: {
          editRequestStatus: LedgerStatus.PENDING,
        },
        newData: {
          editRequestStatus: LedgerStatus.APPROVED,
          editApprovalReason: reason?.trim() || null,
        },
        reason: reason?.trim() || null,
        performedById: user.id,
      },
    })

    // Create audit log for the update
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.UPDATED,
        previousData: previousData as Prisma.InputJsonValue,
        newData: updateData as Prisma.InputJsonValue,
        reason: `Applied approved edit request${reason?.trim() ? `: ${reason.trim()}` : ''}`,
        performedById: user.id,
      },
    })

    return successResponse(updatedEntry, 'Edit request approved and applied successfully')
  } catch (error) {
    console.error('Error approving edit request:', error)
    return errorResponse('Failed to approve edit request', 500)
  }
}

