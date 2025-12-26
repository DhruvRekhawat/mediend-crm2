import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'
import { AppointmentStatus } from '@prisma/client'

const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']),
  remarks: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'MD') {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as AppointmentStatus | null

    const where = status ? { status } : {}

    const appointments = await prisma.mDAppointment.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(appointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return errorResponse('Failed to fetch appointments', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    if (user.role !== 'MD') {
      return errorResponse('Forbidden', 403)
    }

    const { searchParams } = new URL(request.url)
    const appointmentId = searchParams.get('id')

    if (!appointmentId) {
      return errorResponse('Appointment ID required', 400)
    }

    const body = await request.json()
    const { status, remarks } = updateAppointmentSchema.parse(body)

    const appointment = await prisma.mDAppointment.update({
      where: { id: appointmentId },
      data: { 
        status,
        remarks: remarks || undefined,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return successResponse(appointment, 'Appointment updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid status', 400)
    }
    console.error('Error updating appointment:', error)
    return errorResponse('Failed to update appointment', 500)
  }
}

