import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only OUTSTANDING_HEAD and ADMIN can update
    if (user.role !== 'OUTSTANDING_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const body = await request.json()

    // Verify lead exists and has discharge sheet
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        dischargeSheet: {
          select: { id: true },
        },
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (!lead.dischargeSheet) {
      return errorResponse('Lead must have a discharge sheet to update outstanding', 400)
    }

    // Only allow updating these specific fields
    const allowedFields = [
      'hospitalPayoutStatus',
      'doctorPayoutStatus',
      'mediendInvoiceStatus',
      'hospitalAmountPending',
      'doctorAmountPending',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === 'hospitalAmountPending' || key === 'doctorAmountPending') {
          updateData[key] = parseFloat(body[key]) || 0
        } else {
          updateData[key] = body[key]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 400)
    }

    // Update PLRecord
    const updatedRecord = await prisma.pLRecord.upsert({
      where: { leadId: id },
      create: {
        leadId: id,
        ...updateData,
      },
      update: updateData,
    })

    // Fetch updated lead with relations
    const updatedLead = await prisma.lead.findUnique({
      where: { id },
      include: {
        plRecord: true,
        dischargeSheet: {
          select: { id: true },
        },
      },
    })

    return successResponse(updatedLead, 'Outstanding record updated successfully')
  } catch (error) {
    console.error('Error updating outstanding record:', error)
    return errorResponse('Failed to update outstanding record', 500)
  }
}
