import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const createTicketSchema = z.object({
  departmentId: z.string(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

export async function POST(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const body = await request.json()
    const { departmentId, subject, description, priority } = createTicketSchema.parse(body)

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      return errorResponse('Department not found', 404)
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        employeeId: employee.id,
        departmentId,
        subject,
        description,
        priority,
      },
      include: {
        department: {
          select: {
            name: true,
          },
        },
      },
    })

    return successResponse(ticket, 'Ticket raised successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error creating ticket:', error)
    return errorResponse('Failed to create ticket', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    if (!employee) {
      return errorResponse('Employee record not found', 404)
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { employeeId: employee.id },
      include: {
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return errorResponse('Failed to fetch tickets', 500)
  }
}

