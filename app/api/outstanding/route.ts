import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createOutstandingSchema = z.object({
  leadId: z.string(),
  srNo: z.number().optional(),
  month: z.string().optional(),
  dos: z.string().optional(),
  status: z.string().optional(),
  paymentReceived: z.boolean().optional(),
  managerName: z.string().optional(),
  bdmName: z.string().optional(),
  patientName: z.string().optional(),
  treatment: z.string().optional(),
  hospitalName: z.string().optional(),
  billAmount: z.number().optional(),
  settlementAmount: z.number().optional(),
  cashPaidByPatient: z.number().optional(),
  overallAmount: z.number().optional(),
  implantCost: z.number().optional(),
  dciCost: z.number().optional(),
  hospitalSharePct: z.number().optional(),
  hospitalShareAmount: z.number().optional(),
  mediendSharePct: z.number().optional(),
  mediendShareAmount: z.number().optional(),
  remarks: z.string().optional(),
  remark2: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const month = searchParams.get('month')
    const paymentReceived = searchParams.get('paymentReceived')
    const status = searchParams.get('status')

    const where: any = {}
    if (leadId) {
      where.leadId = leadId
    }
    if (month) {
      where.month = new Date(month)
    }
    if (paymentReceived !== null) {
      where.paymentReceived = paymentReceived === 'true'
    }
    if (status) {
      where.status = status
    }

    const outstandingCases = await prisma.outstandingCase.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
            phoneNumber: true,
            hospitalName: true,
            treatment: true,
          },
        },
        handledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate outstanding days for each case
    const casesWithDays = outstandingCases.map((case_) => {
      let outstandingDays = null
      if (case_.dos) {
        const dosDate = new Date(case_.dos)
        const today = new Date()
        const diffTime = today.getTime() - dosDate.getTime()
        outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }
      return {
        ...case_,
        outstandingDays: outstandingDays || case_.outstandingDays,
      }
    })

    return successResponse(casesWithDays)
  } catch (error) {
    console.error('Error fetching outstanding cases:', error)
    return errorResponse('Failed to fetch outstanding cases', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only PL team or Finance team can create outstanding cases
    if (user.role !== 'PL_HEAD' && user.role !== 'FINANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only PL or Finance team can create outstanding cases', 403)
    }

    const body = await request.json()
    const data = createOutstandingSchema.parse(body)

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      include: {
        bd: {
          select: {
            id: true,
            name: true,
          },
        },
        plRecord: {
          select: {
            id: true,
            billAmount: true,
            cashPaidByPatient: true,
            implantCost: true,
            hospitalShareAmount: true,
            mediendShareAmount: true,
          },
        },
      },
    })

    if (!lead) {
      return errorResponse('Lead not found', 404)
    }

    // Check if outstanding case already exists
    const existing = await prisma.outstandingCase.findUnique({
      where: { leadId: data.leadId },
    })

    if (existing) {
      return errorResponse('Outstanding case already exists for this lead', 400)
    }

    // Calculate outstanding days if dos is provided
    let outstandingDays = null
    if (data.dos) {
      const dosDate = new Date(data.dos)
      const today = new Date()
      const diffTime = today.getTime() - dosDate.getTime()
      outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    // Use PNL data if available, otherwise use provided data
    const plData = lead.plRecord
    const outstandingData: any = {
      leadId: data.leadId,
      srNo: data.srNo,
      month: data.month ? new Date(data.month) : null,
      dos: data.dos ? new Date(data.dos) : null,
      status: data.status,
      paymentReceived: data.paymentReceived || false,
      managerName: data.managerName,
      bdmName: data.bdmName || lead.bd?.name,
      patientName: data.patientName || lead.patientName,
      treatment: data.treatment || lead.treatment,
      hospitalName: data.hospitalName || lead.hospitalName,
      billAmount: data.billAmount || plData?.billAmount || lead.billAmount || 0,
      settlementAmount: data.settlementAmount || 0,
      cashPaidByPatient: data.cashPaidByPatient || plData?.cashPaidByPatient || 0,
      overallAmount: data.overallAmount || 0,
      implantCost: data.implantCost || plData?.implantCost || lead.implantAmount || 0,
      dciCost: data.dciCost || 0,
      hospitalSharePct: data.hospitalSharePct,
      hospitalShareAmount: data.hospitalShareAmount || plData?.hospitalShareAmount || 0,
      mediendSharePct: data.mediendSharePct,
      mediendShareAmount: data.mediendShareAmount || plData?.mediendShareAmount || 0,
      outstandingDays: outstandingDays,
      remarks: data.remarks,
      remark2: data.remark2,
      handledById: user.id,
    }

    // Create outstanding case
    const outstandingCase = await prisma.outstandingCase.create({
      data: outstandingData,
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
          },
        },
        handledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse(outstandingCase, 'Outstanding case created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error creating outstanding case:', error)
    return errorResponse('Failed to create outstanding case', 500)
  }
}
