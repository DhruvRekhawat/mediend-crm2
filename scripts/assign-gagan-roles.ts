/**
 * Assign roles for Gagandeep Singh:
 * - gagan@mediend.com → PL_HEAD
 * - gagan1@mediend.com → OUTSTANDING_HEAD (create if not exists)
 *
 * Run: npx tsx scripts/assign-gagan-roles.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

const DEFAULT_PASSWORD = 'Outstanding@123'

async function main() {
  console.log('Assigning roles for Gagandeep Singh...\n')

  // 1. Update gagan@mediend.com to PL_HEAD
  const gagan = await prisma.user.findUnique({
    where: { email: 'gagan@mediend.com' },
  })

  if (gagan) {
    await prisma.user.update({
      where: { id: gagan.id },
      data: { role: 'PL_HEAD' },
    })
    console.log('✅ gagan@mediend.com → PL_HEAD')
  } else {
    console.log('⚠️  gagan@mediend.com not found in database. Skipping.')
  }

  // 2. Create or update gagan1@mediend.com to OUTSTANDING_HEAD
  const gagan1 = await prisma.user.findUnique({
    where: { email: 'gagan1@mediend.com' },
  })

  if (gagan1) {
    await prisma.user.update({
      where: { id: gagan1.id },
      data: { role: 'OUTSTANDING_HEAD' },
    })
    console.log('✅ gagan1@mediend.com → OUTSTANDING_HEAD (updated existing user)')
  } else {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD)
    await prisma.user.create({
      data: {
        email: 'gagan1@mediend.com',
        passwordHash,
        name: 'Gagandeep Singh (Outstanding)',
        role: 'OUTSTANDING_HEAD',
      },
    })
    console.log('✅ gagan1@mediend.com → OUTSTANDING_HEAD (created new user)')
    console.log(`   Password: ${DEFAULT_PASSWORD}`)
  }

  console.log('\nDone.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
