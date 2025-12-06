import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    // Check if users already exist
    const existingUsers = await prisma.user.findMany()
    
    if (existingUsers.length > 0) {
      return errorResponse('Users already exist. Use /api/users to create new users.', 400)
    }

    // Create default admin user
    const adminPasswordHash = await hashPassword('Admin@123')
    await prisma.user.create({
      data: {
        email: 'admin@mediend.com',
        passwordHash: adminPasswordHash,
        name: 'System Admin',
        role: 'ADMIN',
      },
    })

    // Create Sales Head user
    const salesHeadPasswordHash = await hashPassword('SalesHead@123')
    const salesHead = await prisma.user.create({
      data: {
        email: 'saleshead@mediend.com',
        passwordHash: salesHeadPasswordHash,
        name: 'Sales Head',
        role: 'SALES_HEAD',
      },
    })

    // Create a sample Team
    const team = await prisma.team.create({
      data: {
        name: 'North Team',
        circle: 'North',
        salesHeadId: salesHead.id,
      },
    })

    // Create BD user
    const bdPasswordHash = await hashPassword('BD@123')
    await prisma.user.create({
      data: {
        email: 'bd@mediend.com',
        passwordHash: bdPasswordHash,
        name: 'Sample BD',
        role: 'BD',
        teamId: team.id,
      },
    })

    // Create Insurance Head
    const insuranceHeadPasswordHash = await hashPassword('Insurance@123')
    await prisma.user.create({
      data: {
        email: 'insurance@mediend.com',
        passwordHash: insuranceHeadPasswordHash,
        name: 'Insurance Head',
        role: 'INSURANCE_HEAD',
      },
    })

    // Create P/L Head
    const plHeadPasswordHash = await hashPassword('PL@123')
    await prisma.user.create({
      data: {
        email: 'pl@mediend.com',
        passwordHash: plHeadPasswordHash,
        name: 'P/L Head',
        role: 'PL_HEAD',
      },
    })

    // Create HR Head
    const hrHeadPasswordHash = await hashPassword('HR@123')
    await prisma.user.create({
      data: {
        email: 'hr@mediend.com',
        passwordHash: hrHeadPasswordHash,
        name: 'HR Head',
        role: 'HR_HEAD',
      },
    })

    return successResponse({
      message: 'Default users created successfully',
      users: [
        {
          email: 'admin@mediend.com',
          password: 'Admin@123',
          role: 'ADMIN',
        },
        {
          email: 'saleshead@mediend.com',
          password: 'SalesHead@123',
          role: 'SALES_HEAD',
        },
        {
          email: 'bd@mediend.com',
          password: 'BD@123',
          role: 'BD',
        },
        {
          email: 'insurance@mediend.com',
          password: 'Insurance@123',
          role: 'INSURANCE_HEAD',
        },
        {
          email: 'pl@mediend.com',
          password: 'PL@123',
          role: 'PL_HEAD',
        },
        {
          email: 'hr@mediend.com',
          password: 'HR@123',
          role: 'HR_HEAD',
        },
      ],
      team: {
        name: 'North Team',
        circle: 'North',
      },
    }, 'Users seeded successfully')
  } catch (error) {
    console.error('Error seeding users:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(`Failed to seed users: ${message}`, 500)
  }
}

