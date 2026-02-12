import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { canAccessLead, hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { mapStatusCode, mapSourceCode } from '@/lib/mysql-code-mappings'
import { Prisma, PipelineStage } from '@prisma/client'
import { maskPhoneNumber } from '@/lib/phone-utils'

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
        kypSubmission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            location: true,
            area: true,
            aadhar: true,
            pan: true,
            insuranceCard: true,
            disease: true,
            remark: true,
            patientConsent: true,
            aadharFileUrl: true,
            panFileUrl: true,
            insuranceCardFileUrl: true,
            prescriptionFileUrl: true,
            diseasePhotos: true,
            otherFiles: true,
            submittedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            preAuthData: {
              select: {
                id: true,
                requestedHospitalName: true,
                requestedRoomType: true,
                diseaseDescription: true,
                diseaseImages: true,
                preAuthRaisedAt: true,
                sumInsured: true,
                roomRent: true,
                capping: true,
                copay: true,
                icu: true,
                hospitalNameSuggestion: true,
                hospitalSuggestions: true,
                roomTypes: true,
                insurance: true,
                tpa: true,
                handledAt: true,
                approvalStatus: true,
                rejectionReason: true,
                handledBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                preAuthRaisedBy: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                suggestedHospitals: {
                  select: {
                    id: true,
                    hospitalName: true,
                    tentativeBill: true,
                    roomRentGeneral: true,
                    roomRentPrivate: true,
                    roomRentICU: true,
                    notes: true,
                  },
                },
              },
            },
            followUpData: {
              select: {
                id: true,
              },
            },
          },
        },
        insuranceCase: true,
        plRecord: true,
        dischargeSheet: {
          select: {
            id: true,
          },
        },
        insuranceInitiateForm: {
          select: {
            id: true,
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

    // Map status and source codes to text values for display
    // Mask phone number if user is not INSURANCE_HEAD or ADMIN
    const canViewPhone = user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN'
    const mappedLead = {
      ...lead,
      status: mapStatusCode(lead.status),
      source: lead.source ? mapSourceCode(lead.source) : lead.source,
      phoneNumber: canViewPhone ? lead.phoneNumber : (lead.phoneNumber ? maskPhoneNumber(lead.phoneNumber) : null),
    }

    return successResponse(mappedLead)
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
        plRecord: true,
      },
    })

    if (body.plRecord && typeof body.plRecord === 'object') {
      const raw = body.plRecord as Record<string, unknown>
      const plData = (raw.update && typeof raw.update === 'object' ? raw.update : raw) as Record<string, unknown>
      const plAllowed = [
        'month', 'surgeryDate', 'status', 'paymentType', 'approvedOrCash', 'paymentCollectedAt',
        'managerRole', 'managerName', 'bdmName', 'patientName', 'patientPhone', 'doctorName', 'hospitalName',
        'category', 'treatment', 'circle', 'leadSource',
        'totalAmount', 'billAmount', 'cashPaidByPatient', 'cashOrDedPaid', 'referralAmount', 'cabCharges',
        'implantCost', 'dcCharges', 'doctorCharges',
        'hospitalSharePct', 'hospitalShareAmount', 'mediendSharePct', 'mediendShareAmount', 'mediendNetProfit',
        'finalProfit', 'hospitalPayoutStatus', 'doctorPayoutStatus', 'mediendInvoiceStatus',
        'remarks', 'closedAt',
      ]
      const plUpdate: Record<string, unknown> = {}
      for (const key of plAllowed) {
        if (plData[key] !== undefined) {
          const v = plData[key]
          if (key === 'month' || key === 'surgeryDate' || key === 'closedAt') {
            plUpdate[key] = v ? new Date(v as string) : null
          } else {
            plUpdate[key] = v
          }
        }
      }
      if (Object.keys(plUpdate).length > 0) {
        await prisma.pLRecord.upsert({
          where: { leadId: id },
          create: {
            leadId: id,
            ...(plUpdate as any),
          },
          update: plUpdate as any,
        })
      }
    }

    const leadWithPl = await prisma.lead.findUnique({
      where: { id },
      include: {
        bd: { include: { team: true } },
        plRecord: true,
      },
    })

    return successResponse(leadWithPl || updatedLead, 'Lead updated successfully')
  } catch (error) {
    console.error('Error updating lead:', error)
    return errorResponse('Failed to update lead', 500)
  }
}

