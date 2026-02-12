import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { canAccessLead, hasPermission } from '@/lib/rbac'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { mapStatusCode, mapSourceCode } from '@/lib/mysql-code-mappings'
import { Prisma, PipelineStage } from '@prisma/client'
import { maskPhoneNumber } from '@/lib/phone-utils'
export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:read')) {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const pipelineStage = searchParams.get('pipelineStage')
    const status = searchParams.get('status')
    const bdId = searchParams.get('bdId')
    // const teamId = searchParams.get('teamId')
    const circle = searchParams.get('circle')
    const city = searchParams.get('city')
    const hospitalName = searchParams.get('hospitalName')
    const treatment = searchParams.get('treatment')
    const source = searchParams.get('source')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.LeadWhereInput = {}

    // Role-based filtering
    if (user.role === 'BD') {
      where.bdId = user.id
    } else if (user.role === 'TEAM_LEAD' && user.teamId) {
      where.bd = {
        teamId: user.teamId,
      }
    }
    // Note: INSURANCE_HEAD can access all leads via canAccessLead, so we don't filter by bdId

    // For insurance users, only show leads that have KYP submissions or are in insurance-related stages
    if (user.role === 'INSURANCE_HEAD') {
      where.OR = [
        { kypSubmission: { isNot: null } },
        { caseStage: { in: ['KYP_PENDING', 'KYP_COMPLETE', 'PREAUTH_RAISED', 'PREAUTH_COMPLETE', 'INITIATED', 'ADMITTED', 'DISCHARGED', 'IPD_DONE'] } },
      ]
    }

    // Support comma-separated pipeline stages (e.g. PL,COMPLETED for PL dashboard)
    if (pipelineStage) {
      const stages = pipelineStage.split(',').map((s) => s.trim()).filter(Boolean)
      const validStages = stages.filter((s) =>
        ['SALES', 'INSURANCE', 'PL', 'COMPLETED', 'LOST'].includes(s)
      ) as PipelineStage[]
      if (validStages.length === 1) {
        where.pipelineStage = validStages[0]
      } else if (validStages.length > 1) {
        where.pipelineStage = { in: validStages }
      }
    }
    if (status) where.status = status
    if (bdId) where.bdId = bdId
    if (city) where.city = city
    if (hospitalName) where.hospitalName = { contains: hospitalName, mode: 'insensitive' }
    if (treatment) where.treatment = { contains: treatment, mode: 'insensitive' }
    if (source) where.source = source

    if (startDate || endDate) {
      where.createdDate = {}
      if (startDate) where.createdDate.gte = new Date(startDate)
      if (endDate) where.createdDate.lte = new Date(endDate)
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        bd: {
          select: {
            id: true,
            name: true,
            email: true,
            team: {
              select: {
                id: true,
                name: true,
                circle: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        kypSubmission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
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
                insurance: true,
                tpa: true,
                hospitalNameSuggestion: true,
                hospitalSuggestions: true,
                roomTypes: true,
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
              },
            },
          },
        },
        admissionRecord: {
          select: {
            id: true,
            admissionDate: true,
            admittingHospital: true,
          },
        },
        dischargeSheet: {
          select: {
            id: true,
            plRecordId: true,
          },
        },
        plRecord: true,
      },
      orderBy: {
        createdDate: 'desc',
      },
      take: 1000, // Add pagination later
    })

    // Filter leads based on access control
    const accessibleLeads = leads.filter((lead) =>
      canAccessLead(user, lead.bdId, lead.bd.team?.id)
    )

    // Debug logging for insurance users
    if (user.role === 'INSURANCE_HEAD') {
      console.log(`[Insurance Dashboard] Total leads fetched: ${leads.length}`)
      console.log(`[Insurance Dashboard] Accessible leads: ${accessibleLeads.length}`)
      console.log(`[Insurance Dashboard] Leads with KYP: ${accessibleLeads.filter(l => l.kypSubmission).length}`)
      console.log(`[Insurance Dashboard] Leads by caseStage:`, accessibleLeads.reduce((acc, l) => {
        acc[l.caseStage] = (acc[l.caseStage] || 0) + 1
        return acc
      }, {} as Record<string, number>))
    }

    // Map status and source codes to text values for display
    // Mask phone numbers if user is not INSURANCE_HEAD or ADMIN
    const canViewPhone = user.role === 'INSURANCE_HEAD' || user.role === 'ADMIN'
    const mappedLeads = accessibleLeads.map((lead) => ({
      ...lead,
      status: mapStatusCode(lead.status),
      source: lead.source ? mapSourceCode(lead.source) : lead.source,
      phoneNumber: canViewPhone ? lead.phoneNumber : (lead.phoneNumber ? maskPhoneNumber(lead.phoneNumber) : null),
    }))

    return successResponse(mappedLeads)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return errorResponse('Failed to fetch leads', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (!hasPermission(user, 'leads:write')) {
      return errorResponse('Forbidden', 403)
    }

    const body = await request.json()
    const {
      leadRef,
      patientName,
      age,
      sex,
      phoneNumber,
      alternateNumber,
      attendantName,
      bdId,
      status,
      circle,
      city,
      category,
      treatment,
      hospitalName,
      source,
      campaignName,
      remarks,
    } = body

    // Validate BD assignment
    if (user.role === 'BD' && bdId !== user.id) {
      return errorResponse('You can only assign leads to yourself', 403)
    }

    const lead = await prisma.lead.create({
      data: {
        leadRef: leadRef || `LEAD-${Date.now()}`,
        patientName,
        age: parseInt(age),
        sex,
        phoneNumber,
        alternateNumber,
        attendantName,
        bdId: bdId || user.id,
        status: status || 'Hot Lead',
        pipelineStage: 'SALES',
        circle,
        city,
        category,
        treatment,
        hospitalName,
        source,
        campaignName,
        remarks,
        createdById: user.id,
        updatedById: user.id,
      },
      include: {
        bd: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return successResponse(lead, 'Lead created successfully')
  } catch (error) {
    console.error('Error creating lead:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return errorResponse('Lead reference already exists', 400)
    }
    return errorResponse('Failed to create lead', 500)
  }
}

