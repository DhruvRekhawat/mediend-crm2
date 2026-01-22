import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only PL team or Finance team can sync outstanding cases
    if (user.role !== 'PL_HEAD' && user.role !== 'FINANCE_HEAD' && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: Only PL or Finance team can sync outstanding cases', 403)
    }

    const body = await request.json().catch(() => ({}))
    const { leadId, month } = body

    // Find PNL records to sync
    const where: any = {}
    if (leadId) {
      where.leadId = leadId
    }
    if (month) {
      where.month = new Date(month)
    }

    const plRecords = await prisma.pLRecord.findMany({
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
            billAmount: true,
            implantAmount: true,
            surgeryDate: true,
            bd: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const synced = []
    const errors = []

    for (const plRecord of plRecords) {
      try {
        // Check if outstanding case already exists
        const existing = await prisma.outstandingCase.findUnique({
          where: { leadId: plRecord.leadId },
        })

        if (existing) {
          // Update existing outstanding case with PNL data
          const dosDate = plRecord.surgeryDate || plRecord.lead.surgeryDate
          let outstandingDays = null
          if (dosDate) {
            const today = new Date()
            const diffTime = today.getTime() - new Date(dosDate).getTime()
            outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          }

          await prisma.outstandingCase.update({
            where: { id: existing.id },
            data: {
              month: plRecord.month,
              dos: plRecord.surgeryDate,
              billAmount: plRecord.billAmount,
              cashPaidByPatient: plRecord.cashPaidByPatient,
              implantCost: plRecord.implantCost,
              hospitalShareAmount: plRecord.hospitalShareAmount,
              mediendShareAmount: plRecord.mediendShareAmount,
              hospitalSharePct: plRecord.hospitalSharePct,
              mediendSharePct: plRecord.mediendSharePct,
              outstandingDays: outstandingDays,
              handledById: user.id,
            },
          })

          synced.push({ leadId: plRecord.leadId, action: 'updated' })
        } else {
          // Create new outstanding case from PNL data
          const dosDate = plRecord.surgeryDate || plRecord.lead.surgeryDate
          let outstandingDays = null
          if (dosDate) {
            const today = new Date()
            const diffTime = today.getTime() - new Date(dosDate).getTime()
            outstandingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          }

          await prisma.outstandingCase.create({
            data: {
              leadId: plRecord.leadId,
              month: plRecord.month,
              dos: plRecord.surgeryDate,
              status: plRecord.status,
              paymentReceived: false,
              bdmName: plRecord.bdmName || plRecord.lead.bd?.name,
              patientName: plRecord.patientName || plRecord.lead.patientName,
              treatment: plRecord.treatment || plRecord.lead.treatment,
              hospitalName: plRecord.hospitalName || plRecord.lead.hospitalName,
              billAmount: plRecord.billAmount,
              cashPaidByPatient: plRecord.cashPaidByPatient,
              implantCost: plRecord.implantCost,
              hospitalShareAmount: plRecord.hospitalShareAmount,
              mediendShareAmount: plRecord.mediendShareAmount,
              hospitalSharePct: plRecord.hospitalSharePct,
              mediendSharePct: plRecord.mediendSharePct,
              outstandingDays: outstandingDays,
              handledById: user.id,
            },
          })

          synced.push({ leadId: plRecord.leadId, action: 'created' })
        }
      } catch (error) {
        errors.push({ leadId: plRecord.leadId, error: String(error) })
      }
    }

    return successResponse({
      synced: synced.length,
      errors: errors.length,
      details: {
        synced,
        errors,
      },
    }, `Synced ${synced.length} outstanding cases`)
  } catch (error) {
    console.error('Error syncing outstanding cases:', error)
    return errorResponse('Failed to sync outstanding cases', 500)
  }
}
