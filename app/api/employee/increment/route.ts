import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const incrementSchema = z.object({
  reason: z.string().min(50, 'Please provide a detailed reason (at least 50 characters)'),
  achievements: z.string().optional(),
  requestedAmount: z.number().optional(),
  documents: z.array(z.string().url()).max(5).optional(),
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

    if (!employee.salary) {
      return errorResponse('Current salary not set. Please contact HR.', 400)
    }

    // Check for existing pending request
    const existingRequest = await prisma.incrementRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return errorResponse('You already have a pending increment request', 400)
    }

    const body = await request.json()
    const { reason, achievements, requestedAmount, documents } = incrementSchema.parse(body)

    const incrementRequest = await prisma.incrementRequest.create({
      data: {
        employeeId: employee.id,
        currentSalary: employee.salary,
        requestedAmount: requestedAmount || null,
        reason,
        achievements: achievements || null,
        documents: documents ?? undefined,
      },
    })

    return successResponse(incrementRequest, 'Increment request submitted successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error submitting increment request:', error)
    return errorResponse('Failed to submit request', 500)
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

    const requests = await prisma.incrementRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(requests)
  } catch (error) {
    console.error('Error fetching increment requests:', error)
    return errorResponse('Failed to fetch requests', 500)
  }
}

