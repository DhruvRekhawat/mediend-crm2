import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { z } from 'zod'

const messageSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
})

// POST - Submit anonymous message (NO AUTH REQUIRED for anonymity)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = messageSchema.parse(body)

    // Create message WITHOUT any user association
    const anonymousMessage = await prisma.anonymousMessage.create({
      data: {
        message,
      },
    })

    return successResponse({ id: anonymousMessage.id }, 'Message sent anonymously')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400)
    }
    console.error('Error submitting anonymous message:', error)
    return errorResponse('Failed to submit message', 500)
  }
}

