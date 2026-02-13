import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/session'
import { z } from 'zod'
import { canFillInitiateForm } from '@/lib/case-permissions'

const updateInsuranceInitiateFormSchema = z.object({
  totalBillAmount: z.number().min(0),
  discount: z.number().min(0),
  otherReductions: z.number().min(0),
  copay: z.number().nullable().optional(),
  copayBuffer: z.number().min(0),
  deductible: z.number().min(0),
  exceedsPolicyLimit: z.string().nullable().optional(),
  policyDeductibleAmount: z.number().min(0),
  totalAuthorizedAmount: z.number().min(0),
  amountToBePaidByInsurance: z.number().min(0),
  roomCategory: z.string().nullable().optional(),
  initialApprovalByHospitalUrl: z.string().nullable().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const form = await prisma.insuranceInitiateForm.findUnique({
      where: { id: resolvedParams.id },
      include: {
        createdBy: true,
        lead: true,
      },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({ form })
  } catch (error) {
    console.error('Error fetching initiate form:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getSessionFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const data = updateInsuranceInitiateFormSchema.parse(body)

    const existingForm = await prisma.insuranceInitiateForm.findUnique({
      where: { id: resolvedParams.id },
      include: {
        lead: true,
      },
    })

    if (!existingForm) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Check permissions
    if (!canFillInitiateForm(user, existingForm.lead)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedForm = await prisma.insuranceInitiateForm.update({
      where: { id: resolvedParams.id },
      data: {
        ...data,
      },
      include: {
        createdBy: true,
        lead: true,
      },
    })

    return NextResponse.json({ initiateForm: updatedForm })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 })
    }
    console.error('Error updating initiate form:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}