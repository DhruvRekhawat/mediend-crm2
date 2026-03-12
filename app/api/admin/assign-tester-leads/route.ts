import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { CaseStage } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Find or create TESTER user
    let testerUser = await prisma.user.findUnique({
      where: { email: 'tester@mediend.com' },
    })

    if (!testerUser) {
      return errorResponse('TESTER user (tester@mediend.com) not found', 404)
    }

    // Define early stages - NEW_LEAD or KYP_BASIC_PENDING (before any KYP done)
    const earlyStages = [CaseStage.NEW_LEAD, CaseStage.KYP_BASIC_PENDING]

    // Find all leads in early stage (card details only, no KYP done)
    const leadsToAssign = await prisma.lead.findMany({
      where: {
        caseStage: {
          in: earlyStages,
        },
      },
      select: {
        id: true,
        leadRef: true,
        patientName: true,
        caseStage: true,
        bdId: true,
      },
    })

    if (leadsToAssign.length === 0) {
      return successResponse({
        message: 'No leads found in early stage (NEW_LEAD, KYP_BASIC_PENDING)',
        reassigned: 0,
        leads: [],
      })
    }

    // Update all leads to assign to TESTER
    const updated = await prisma.lead.updateMany({
      where: {
        caseStage: {
          in: earlyStages,
        },
      },
      data: {
        bdId: testerUser.id,
        updatedById: testerUser.id,
      },
    })

    return successResponse({
      message: `Successfully reassigned ${updated.count} leads (early stage: NEW_LEAD, KYP_BASIC_PENDING) to TESTER`,
      reassigned: updated.count,
      stages: earlyStages,
      description: 'Leads with card details only, no KYP completed',
      testerUser: {
        id: testerUser.id,
        email: testerUser.email,
        name: testerUser.name,
      },
      sampleLeads: leadsToAssign.slice(0, 5),
    })
  } catch (error) {
    console.error('Error assigning leads to TESTER:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(`Failed to assign leads: ${message}`, 500)
  }
}
