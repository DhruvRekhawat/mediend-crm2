import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { LedgerStatus, LedgerAuditAction } from '@prisma/client'

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

    // Editing requires MD approval (finance:approve permission)
    if (!hasPermission(user, 'finance:approve')) {
      return errorResponse('Only MD can edit ledger entries', 403)
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.ledgerEntry.findUnique({
      where: { id },
      include: {
        party: true,
        head: true,
        paymentMode: true,
      },
    })

    if (!existing) {
      return errorResponse('Ledger entry not found', 404)
    }

    // Cannot edit approved transactions - they are immutable
    if (existing.status === LedgerStatus.APPROVED) {
      return errorResponse('Cannot edit approved transactions', 400)
    }

    // Only allow editing certain fields for pending entries
    const { description, transactionDate, partyId, headId, paymentTypeId } = body

    // Store previous data for audit
    const previousData = {
      description: existing.description,
      transactionDate: existing.transactionDate,
      partyId: existing.partyId,
      headId: existing.headId,
      paymentTypeId: existing.paymentTypeId,
    }

    // Validate new party if provided
    if (partyId && partyId !== existing.partyId) {
      const party = await prisma.partyMaster.findUnique({
        where: { id: partyId },
      })
      if (!party || !party.isActive) {
        return errorResponse('Invalid or inactive party', 400)
      }
    }

    // Validate new head if provided
    if (headId && headId !== existing.headId) {
      const head = await prisma.headMaster.findUnique({
        where: { id: headId },
      })
      if (!head || !head.isActive) {
        return errorResponse('Invalid or inactive head', 400)
      }
    }

    // Validate new payment type if provided
    if (paymentTypeId && paymentTypeId !== existing.paymentTypeId) {
      const paymentType = await prisma.paymentTypeMaster.findUnique({
        where: { id: paymentTypeId },
      })
      if (!paymentType || !paymentType.isActive) {
        return errorResponse('Invalid or inactive payment type', 400)
      }
    }

    const entry = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(transactionDate !== undefined && { transactionDate: new Date(transactionDate) }),
        ...(partyId !== undefined && { partyId }),
        ...(headId !== undefined && { headId }),
        ...(paymentTypeId !== undefined && { paymentTypeId }),
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
        previousData,
        newData: {
          description: entry.description,
          transactionDate: entry.transactionDate,
          partyId: entry.partyId,
          headId: entry.headId,
          paymentTypeId: entry.paymentTypeId,
        },
        performedById: user.id,
      },
    })

    return successResponse(entry, 'Ledger entry updated successfully')
  } catch (error) {
    console.error('Error updating ledger entry:', error)
    return errorResponse('Failed to update ledger entry', 500)
  }
}

