import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { z } from 'zod'

const mentalHealthSchema = z.object({
  reason: z.string().optional(),
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
    const { reason } = mentalHealthSchema.parse(body)

    // Check for existing pending request
    const existingRequest = await prisma.mentalHealthRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return errorResponse('You have a pending mental health request', 400)
    }

    const mentalHealthRequest = await prisma.mentalHealthRequest.create({
      data: {
        employeeId: employee.id,
        reason: reason || null,
      },
    })

    return successResponse(mentalHealthRequest, 'Mental health request submitted. HR will respond within 48 hours.')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 400)
    }
    console.error('Error submitting mental health request:', error)
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

    const requests = await prisma.mentalHealthRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(requests)
  } catch (error) {
    console.error('Error fetching mental health requests:', error)
    return errorResponse('Failed to fetch requests', 500)
  }
}

