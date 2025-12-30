import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, LedgerAuditAction, Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id },
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
        auditLogs: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { performedAt: 'desc' },
        },
      },
    })

    if (!entry) {
      return errorResponse('Ledger entry not found', 404)
    }

    return successResponse(entry)
  } catch (error) {
    console.error('Error fetching ledger entry:', error)
    return errorResponse('Failed to fetch ledger entry', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only finance team can apply approved edits
    if (!hasPermission(user, 'finance:write')) {
      return errorResponse('Only finance team can apply edits', 403)
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        party: true,
        head: true,
        paymentType: true,
        paymentMode: true,
      },
    })

    if (!existing) {
      return errorResponse('Ledger entry not found', 404)
    }

    if (existing.isDeleted) {
      return errorResponse('Cannot edit deleted entry', 400)
    }

    // Can only apply edits if edit request was approved
    if (existing.editRequestStatus !== LedgerStatus.APPROVED) {
      return errorResponse('Edit request must be approved before applying changes', 400)
    }

    if (!existing.editRequestData || typeof existing.editRequestData !== 'object') {
      return errorResponse('No approved edit data found', 400)
    }

    const changes = existing.editRequestData as Record<string, unknown>

    // Store previous data for audit
    const previousData = {
      description: existing.description,
      transactionDate: existing.transactionDate,
      partyId: existing.partyId,
      headId: existing.headId,
      paymentTypeId: existing.paymentTypeId,
    }

    // Validate and apply changes
    const updateData: Record<string, unknown> = {}

    if (changes.description !== undefined) {
      updateData.description = changes.description
    }

    if (changes.transactionDate !== undefined) {
      updateData.transactionDate = new Date(changes.transactionDate as string)
    }

    if (changes.partyId !== undefined && changes.partyId !== existing.partyId) {
      const party = await prisma.partyMaster.findUnique({
        where: { id: changes.partyId as string },
      })
      if (!party || !party.isActive) {
        return errorResponse('Invalid or inactive party', 400)
      }
      updateData.partyId = changes.partyId
    }

    if (changes.headId !== undefined && changes.headId !== existing.headId) {
      const head = await prisma.headMaster.findUnique({
        where: { id: changes.headId as string },
      })
      if (!head || !head.isActive) {
        return errorResponse('Invalid or inactive head', 400)
      }
      updateData.headId = changes.headId
    }

    if (changes.paymentTypeId !== undefined && changes.paymentTypeId !== existing.paymentTypeId) {
      const paymentType = await prisma.paymentTypeMaster.findUnique({
        where: { id: changes.paymentTypeId as string },
      })
      if (!paymentType || !paymentType.isActive) {
        return errorResponse('Invalid or inactive payment type', 400)
      }
      updateData.paymentTypeId = changes.paymentTypeId
    }

    // Apply the changes and clear edit request fields
    const entry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        ...updateData,
        // Clear edit request fields after applying
        editRequestStatus: null,
        editRequestReason: null,
        editRequestData: Prisma.JsonNull,
        editRequestedById: null,
        editRequestedAt: null,
        editApprovalReason: null,
        editApprovedById: null,
        editApprovedAt: null,
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

    // Create audit log
    await prisma.ledgerAuditLog.create({
      data: {
        ledgerEntryId: entry.id,
        action: LedgerAuditAction.UPDATED,
        previousData: previousData as Prisma.InputJsonValue,
        newData: updateData as Prisma.InputJsonValue,
        reason: 'Applied approved edit request',
        performedById: user.id,
      },
    })

    return successResponse(entry, 'Ledger entry updated successfully')
  } catch (error) {
    console.error('Error updating ledger entry:', error)
    return errorResponse('Failed to update ledger entry', 500)
  }
}

