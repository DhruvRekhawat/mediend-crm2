import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { PipelineStage, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only OUTSTANDING_HEAD and ADMIN can access
    if (user.role !== 'OUTSTANDING_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.LeadWhereInput = {
      // Only show leads that have discharge sheets
      dischargeSheet: { isNot: null },
      // Only show PL or COMPLETED pipeline stages
      pipelineStage: { in: ['PL', 'COMPLETED'] },
    }

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
            name: true,
            team: {
              select: {
                id: true,
              },
            },
          },
        },
        dischargeSheet: {
          select: {
            id: true,
          },
        },
        plRecord: {
          select: {
            hospitalPayoutStatus: true,
            doctorPayoutStatus: true,
            mediendInvoiceStatus: true,
            hospitalAmountPending: true,
            doctorAmountPending: true,
            month: true,
            surgeryDate: true,
            managerName: true,
            bdmName: true,
            billAmount: true,
            totalAmount: true,
            finalProfit: true,
            mediendNetProfit: true,
          },
        },
        outstandingCase: {
          select: {
            paymentReceived: true,
            remark2: true,
          },
        },
      },
      orderBy: {
        createdDate: 'desc',
      },
      take: 1000,
    })

    return successResponse(leads)
  } catch (error) {
    console.error('Error fetching outstanding records:', error)
    return errorResponse('Failed to fetch outstanding records', 500)
  }
}
