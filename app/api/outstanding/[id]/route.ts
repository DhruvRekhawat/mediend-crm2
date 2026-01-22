import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const updateOutstandingSchema = z.object({
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

    const outstandingCase = await prisma.outstandingCase.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
            phoneNumber: true,
            hospitalName: true,
            treatment: true,
            billAmount: true,
            implantAmount: true,
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

    if (!outstandingCase) {
      return errorResponse('Outstanding case not found', 404)
    }

    // Calculate outstanding days
    let outstandingDays = outstandingCase.outstandingDays
    if (outstandingCase.dos) {
      const dosDate = new Date(outstandingCase.dos)
      const today = new Date()
      const diffTime = today.getTime() - dosDate.getTime()
      outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    return successResponse({
      ...outstandingCase,
      outstandingDays,
    })
  } catch (error) {
    console.error('Error fetching outstanding case:', error)
    return errorResponse('Failed to fetch outstanding case', 500)
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

    // Only PL team or Finance team can update outstanding cases
    if (user.role !== 'PL_HEAD' && user.role !== 'FINANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only PL or Finance team can update outstanding cases', 403)
    }

    const { id } = await params
    const body = await request.json()
    const data = updateOutstandingSchema.parse(body)

    // Check if outstanding case exists
    const existing = await prisma.outstandingCase.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Outstanding case not found', 404)
    }

    // Prepare update data
    const updateData: any = {}
    if (data.srNo !== undefined) updateData.srNo = data.srNo
    if (data.month !== undefined) updateData.month = data.month ? new Date(data.month) : null
    if (data.dos !== undefined) {
      updateData.dos = data.dos ? new Date(data.dos) : null
      // Recalculate outstanding days if dos is updated
      if (data.dos) {
        const dosDate = new Date(data.dos)
        const today = new Date()
        const diffTime = today.getTime() - dosDate.getTime()
        updateData.outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }
    }
    if (data.status !== undefined) updateData.status = data.status
    if (data.paymentReceived !== undefined) updateData.paymentReceived = data.paymentReceived
    if (data.managerName !== undefined) updateData.managerName = data.managerName
    if (data.bdmName !== undefined) updateData.bdmName = data.bdmName
    if (data.patientName !== undefined) updateData.patientName = data.patientName
    if (data.treatment !== undefined) updateData.treatment = data.treatment
    if (data.hospitalName !== undefined) updateData.hospitalName = data.hospitalName
    if (data.billAmount !== undefined) updateData.billAmount = data.billAmount
    if (data.settlementAmount !== undefined) updateData.settlementAmount = data.settlementAmount
    if (data.cashPaidByPatient !== undefined) updateData.cashPaidByPatient = data.cashPaidByPatient
    if (data.overallAmount !== undefined) updateData.overallAmount = data.overallAmount
    if (data.implantCost !== undefined) updateData.implantCost = data.implantCost
    if (data.dciCost !== undefined) updateData.dciCost = data.dciCost
    if (data.hospitalSharePct !== undefined) updateData.hospitalSharePct = data.hospitalSharePct
    if (data.hospitalShareAmount !== undefined) updateData.hospitalShareAmount = data.hospitalShareAmount
    if (data.mediendSharePct !== undefined) updateData.mediendSharePct = data.mediendSharePct
    if (data.mediendShareAmount !== undefined) updateData.mediendShareAmount = data.mediendShareAmount
    if (data.remarks !== undefined) updateData.remarks = data.remarks
    if (data.remark2 !== undefined) updateData.remark2 = data.remark2

    // Update outstanding case
    const updated = await prisma.outstandingCase.update({
      where: { id },
      data: updateData,
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

    return successResponse(updated, 'Outstanding case updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error updating outstanding case:', error)
    return errorResponse('Failed to update outstanding case', 500)
  }
}
