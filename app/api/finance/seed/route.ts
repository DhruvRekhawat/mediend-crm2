import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { type } = body

    // Seed Payment Types
    if (!type || type === 'payment-types') {
      const existingTypes = await prisma.paymentTypeMaster.findMany()
      
      if (existingTypes.length === 0) {
        await prisma.paymentTypeMaster.createMany({
          data: [
            {
              name: 'Expense',
              paymentType: 'EXPENSE',
              description: 'Operational and business expenses',
            },
            {
              name: 'Non-Expense',
              paymentType: 'NON_EXPENSE',
              description: 'Non-operational transactions',
            },
          ],
        })
      }
    }

    // Seed default Heads
    if (!type || type === 'heads') {
      const existingHeads = await prisma.headMaster.findMany()
      
      if (existingHeads.length === 0) {
        await prisma.headMaster.createMany({
          data: [
            { name: 'Sales', department: 'Sales', description: 'Sales related transactions' },
            { name: 'IT Project', department: 'IT', description: 'IT projects and services' },
            { name: 'Operations', department: 'Operations', description: 'Operational expenses' },
            { name: 'Marketing', department: 'Marketing', description: 'Marketing and advertising' },
            { name: 'HR', department: 'HR', description: 'Human resources related' },
            { name: 'Admin', department: 'Admin', description: 'Administrative expenses' },
          ],
        })
      }
    }

    // Get current counts
    const [paymentTypes, heads, parties, paymentModes] = await Promise.all([
      prisma.paymentTypeMaster.findMany(),
      prisma.headMaster.findMany(),
      prisma.partyMaster.findMany(),
      prisma.paymentModeMaster.findMany(),
    ])

    return successResponse({
      message: 'Finance masters seeded successfully',
      counts: {
        paymentTypes: paymentTypes.length,
        heads: heads.length,
        parties: parties.length,
        paymentModes: paymentModes.length,
      },
      paymentTypes,
      heads,
    })
  } catch (error) {
    console.error('Error seeding finance masters:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(`Failed to seed finance masters: ${message}`, 500)
  }
}

