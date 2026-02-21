import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { UserRole } from '@prisma/client'

const VALID_ROLES = Object.values(UserRole)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    // If body is provided, create a single user
    if (body && body.email) {
      const { email, password, name, role, teamId } = body

      if (!email || !password || !name || !role) {
        return errorResponse('Missing required fields: email, password, name, role', 400)
      }

      if (!VALID_ROLES.includes(role)) {
        return errorResponse(`Invalid role. Valid roles: ${VALID_ROLES.join(', ')}`, 400)
      }

      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim()

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (existingUser) {
        return errorResponse('User with this email already exists', 400)
      }

      const passwordHash = await hashPassword(password)
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role,
          ...(teamId && { teamId }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          teamId: true,
          createdAt: true,
        },
      })

      return successResponse({
        message: 'User created successfully',
        user,
      })
    }

    // No body provided - seed all default users
    const existingUsers = await prisma.user.findMany()
    
    // Check if we already have the specific users we want to seed
    const defaultEmails = [
      'admin@mediend.com',
      'saleshead@mediend.com',
      'bd@mediend.com',
      'insurance@mediend.com',
      'pl@mediend.com',
      'hr@mediend.com',
      'finance@mediend.com'
    ]

    const existingDefaultUsers = await prisma.user.findMany({
      where: { email: { in: defaultEmails } }
    })

    if (existingDefaultUsers.length === defaultEmails.length) {
      return errorResponse('Default users already exist.', 400)
    }

    const seededUsers = []

    // Create default admin user if not exists
    if (!existingDefaultUsers.find(u => u.email === 'admin@mediend.com')) {
      const adminPasswordHash = await hashPassword('Admin@123')
      await prisma.user.create({
        data: {
          email: 'admin@mediend.com',
          passwordHash: adminPasswordHash,
          name: 'System Admin',
          role: 'ADMIN',
        },
      })
      seededUsers.push({ email: 'admin@mediend.com', password: 'Admin@123', role: 'ADMIN' })
    }

    // Create Sales Head user if not exists
    let salesHead = existingDefaultUsers.find(u => u.email === 'saleshead@mediend.com')
    if (!salesHead) {
      const salesHeadPasswordHash = await hashPassword('SalesHead@123')
      salesHead = await prisma.user.create({
        data: {
          email: 'saleshead@mediend.com',
          passwordHash: salesHeadPasswordHash,
          name: 'Sales Head',
          role: 'SALES_HEAD',
        },
      })
      seededUsers.push({ email: 'saleshead@mediend.com', password: 'SalesHead@123', role: 'SALES_HEAD' })
    }

    // Create a sample Team if not exists
    let team = await prisma.team.findFirst({ where: { name: 'North Team' } })
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'North Team',
          circle: 'North',
          salesHeadId: salesHead.id,
        },
      })
    }

    // Create BD user if not exists
    if (!existingDefaultUsers.find(u => u.email === 'bd@mediend.com')) {
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
      seededUsers.push({ email: 'bd@mediend.com', password: 'BD@123', role: 'BD' })
    }

    // Create Insurance Head if not exists
    if (!existingDefaultUsers.find(u => u.email === 'insurance@mediend.com')) {
      const insuranceHeadPasswordHash = await hashPassword('Insurance@123')
      await prisma.user.create({
        data: {
          email: 'insurance@mediend.com',
          passwordHash: insuranceHeadPasswordHash,
          name: 'Insurance Head',
          role: 'INSURANCE_HEAD',
        },
      })
      seededUsers.push({ email: 'insurance@mediend.com', password: 'Insurance@123', role: 'INSURANCE_HEAD' })
    }

    // Create P/L Head if not exists
    if (!existingDefaultUsers.find(u => u.email === 'pl@mediend.com')) {
      const plHeadPasswordHash = await hashPassword('PL@123')
      await prisma.user.create({
        data: {
          email: 'pl@mediend.com',
          passwordHash: plHeadPasswordHash,
          name: 'P/L Head',
          role: 'PL_HEAD',
        },
      })
      seededUsers.push({ email: 'pl@mediend.com', password: 'PL@123', role: 'PL_HEAD' })
    }

    // Create HR Head if not exists
    if (!existingDefaultUsers.find(u => u.email === 'hr@mediend.com')) {
      const hrHeadPasswordHash = await hashPassword('HR@123')
      await prisma.user.create({
        data: {
          email: 'hr@mediend.com',
          passwordHash: hrHeadPasswordHash,
          name: 'HR Head',
          role: 'HR_HEAD',
        },
      })
      seededUsers.push({ email: 'hr@mediend.com', password: 'HR@123', role: 'HR_HEAD' })
    }

    // Create Finance Head if not exists
    if (!existingDefaultUsers.find(u => u.email === 'finance@mediend.com')) {
      const financeHeadPasswordHash = await hashPassword('Finance@123')
      await prisma.user.create({
        data: {
          email: 'finance@mediend.com',
          passwordHash: financeHeadPasswordHash,
          name: 'Finance Head',
          role: 'FINANCE_HEAD',
        },
      })
      seededUsers.push({ email: 'finance@mediend.com', password: 'Finance@123', role: 'FINANCE_HEAD' })
    }

    return successResponse({
      message: 'Default users created successfully',
      users: seededUsers,
      team: { name: 'North Team', circle: 'North' },
    }, 'Users seeded successfully')
  } catch (error) {
    console.error('Error seeding users:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(`Failed to seed users: ${message}`, 500)
  }
}
