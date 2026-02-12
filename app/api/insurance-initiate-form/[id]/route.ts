import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-utils'
import { hasPermission } from '@/lib/rbac'
import { z } from 'zod'

const updateInsuranceInitiateFormSchema = z.object({
  totalBillAmount: z.number().optional(),
  discount: z.number().optional(),
  otherReductions: z.number().optional(),
  copay: z.number().nullable().optional(),
  copayBuffer: z.number().optional(),
  deductible: z.number().optional(),
  exceedsPolicyLimit: z.string().optional(),
  policyDeductibleAmount: z.number().optional(),
  totalAuthorizedAmount: z.number().optional(),
  amountToBePaidByInsurance: z.number().optional(),
  roomCategory: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return unauthorizedResponse()
    }

    // Only Insurance team can update initiate form
    if (!hasPermission(user, 'insurance:write')) {
      return errorResponse('Forbidden: Only Insurance team can update initiate form', 403)
    }

    const { id } = await params
    const body = await request.json()
    const data = updateInsuranceInitiateFormSchema.parse(body)

    // Check if form exists
    const existingForm = await prisma.insuranceInitiateForm.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            caseStage: true,
          },
        },
      },
    })

    if (!existingForm) {
      return errorResponse('Initiate form not found', 404)
    }

    // Update the form
    const updatedForm = await prisma.insuranceInitiateForm.update({
      where: { id },
      data: {
        ...(data.totalBillAmount !== undefined && { totalBillAmount: data.totalBillAmount }),
        ...(data.discount !== undefined && { discount: data.discount }),
        ...(data.otherReductions !== undefined && { otherReductions: data.otherReductions }),
        ...(data.copay !== undefined && { copay: data.copay }),
        ...(data.copayBuffer !== undefined && { copayBuffer: data.copayBuffer }),
        ...(data.deductible !== undefined && { deductible: data.deductible }),
        ...(data.exceedsPolicyLimit !== undefined && { exceedsPolicyLimit: data.exceedsPolicyLimit }),
        ...(data.policyDeductibleAmount !== undefined && { policyDeductibleAmount: data.policyDeductibleAmount }),
        ...(data.totalAuthorizedAmount !== undefined && { totalAuthorizedAmount: data.totalAuthorizedAmount }),
        ...(data.amountToBePaidByInsurance !== undefined && { amountToBePaidByInsurance: data.amountToBePaidByInsurance }),
        ...(data.roomCategory !== undefined && { roomCategory: data.roomCategory }),
      },
    })

    return successResponse(
      { initiateForm: updatedForm },
      'Insurance initiate form updated successfully'
    )
  } catch (error) {
    console.error('Error updating insurance initiate form:', error)
    if (error instanceof z.ZodError) {
      return errorResponse(`Validation error: ${error.errors.map((e) => e.message).join(', ')}`, 400)
    }
    return errorResponse('Failed to update insurance initiate form', 500)
  }
}

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

    const initiateForm = await prisma.insuranceInitiateForm.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            leadRef: true,
            patientName: true,
          },
        },
      },
    })

    if (!initiateForm) {
      return errorResponse('Initiate form not found', 404)
    }

    return successResponse({ initiateForm }, 'Initiate form retrieved successfully')
  } catch (error) {
    console.error('Error fetching insurance initiate form:', error)
    return errorResponse('Failed to fetch insurance initiate form', 500)
  }
}
