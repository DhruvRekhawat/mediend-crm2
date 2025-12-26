import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { PartyType } from '@prisma/client'

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

    const party = await prisma.partyMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    })

    if (!party) {
      return errorResponse('Party not found', 404)
    }

    return successResponse(party)
  } catch (error) {
    console.error('Error fetching party:', error)
    return errorResponse('Failed to fetch party', 500)
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

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      partyType,
      contactName,
      contactEmail,
      contactPhone,
      gstNumber,
      panNumber,
      address,
      isActive,
    } = body

    const existing = await prisma.partyMaster.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Party not found', 404)
    }

    if (partyType && !Object.values(PartyType).includes(partyType)) {
      return errorResponse('Invalid party type', 400)
    }

    const party = await prisma.partyMaster.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(partyType !== undefined && { partyType }),
        ...(contactName !== undefined && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(gstNumber !== undefined && { gstNumber }),
        ...(panNumber !== undefined && { panNumber }),
        ...(address !== undefined && { address }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return successResponse(party, 'Party updated successfully')
  } catch (error) {
    console.error('Error updating party:', error)
    return errorResponse('Failed to update party', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'finance:masters:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params

    // Check if party has any ledger entries
    const entriesCount = await prisma.ledgerEntry.count({
      where: { partyId: id },
    })

    if (entriesCount > 0) {
      return errorResponse(
        'Cannot delete party with existing ledger entries. Deactivate it instead.',
        400
      )
    }

    await prisma.partyMaster.delete({
      where: { id },
    })

    return successResponse(null, 'Party deleted successfully')
  } catch (error) {
    console.error('Error deleting party:', error)
    return errorResponse('Failed to delete party', 500)
  }
}

