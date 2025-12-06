import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { canAccessLead, hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { Prisma, PipelineStage } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        bd: {
          include: {
            team: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        stageEvents: {
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
        insuranceCase: true,
        plRecord: true,
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (!canAccessLead(user, lead.bdId, lead.bd.team?.id)) {
      return errorResponse('Forbidden', 403)
    }

    return successResponse(lead)
  } catch (error) {
    console.error('Error fetching lead:', error)
    return errorResponse('Failed to fetch lead', 500)
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

    if (!hasPermission(user, 'leads:write')) {
      return errorResponse('Forbidden', 403)
    }

    const { id } = await params
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        bd: {
          include: {
            team: true,
          },
        },
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    if (!canAccessLead(user, lead.bdId, lead.bd.team?.id)) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const updateData: Prisma.LeadUpdateInput = {
      updatedBy: { connect: { id: user.id } },
      updatedDate: new Date(),
    }

    // Track stage changes
    if (body.pipelineStage && body.pipelineStage !== lead.pipelineStage) {
      await prisma.leadStageEvent.create({
        data: {
          leadId: lead.id,
          fromStage: lead.pipelineStage,
          toStage: body.pipelineStage as PipelineStage,
          changedById: user.id,
          note: body.stageChangeNote,
        },
      })
      updateData.pipelineStage = body.pipelineStage as PipelineStage
    }

    // Update other fields
    const allowedFields = [
      'status',
      'patientName',
      'age',
      'sex',
      'phoneNumber',
      'alternateNumber',
      'attendantName',
      'bdId',
      'circle',
      'city',
      'category',
      'treatment',
      'anesthesia',
      'quantityGrade',
      'surgeonName',
      'surgeonType',
      'hospitalName',
      'modeOfPayment',
      'discount',
      'copay',
      'deduction',
      'settledTotal',
      'billAmount',
      'insuranceName',
      'tpa',
      'sumInsured',
      'roomRent',
      'icu',
      'capping',
      'arrivalDate',
      'arrivalTime',
      'surgeryDate',
      'operationTime',
      'implantType',
      'implantAmount',
      'instrument',
      'consumables',
      'remarks',
      'source',
      'campaignName',
      'bdeName',
      'conversionDate',
      'mediendProfit',
      'hospitalShare',
      'doctorShare',
      'othersShare',
      'netProfit',
      'ticketSize',
    ] as const

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updateData as any)[field] = body[field]
      }
    }

    // Handle BD reassignment
    if (body.bdId && body.bdId !== lead.bdId) {
      if (user.role === 'BD' && body.bdId !== user.id) {
        return errorResponse('You can only assign leads to yourself', 403)
      }
      if (user.role === 'TEAM_LEAD' && user.teamId) {
        // Verify new BD is in the same team
        const newBd = await prisma.user.findUnique({
          where: { id: body.bdId },
        })
        if (!newBd || newBd.teamId !== user.teamId) {
          return errorResponse('Can only reassign to BDs in your team', 403)
        }
      }
      updateData.bd = { connect: { id: body.bdId } }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        bd: {
          include: {
            team: true,
          },
        },
      },
    })

    return successResponse(updatedLead, 'Lead updated successfully')
  } catch (error) {
    console.error('Error updating lead:', error)
    return errorResponse('Failed to update lead', 500)
  }
}

