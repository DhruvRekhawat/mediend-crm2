/**
 * Migration script: set Employee.managerId from existing Team and DepartmentTeam structure.
 *
 * - DepartmentTeam: for each member Employee, set managerId = teamLeadId (if team has a lead).
 * - Team (sales): for each User in team.members, find their Employee and set managerId to the
 *   sales head's Employee id.
 *
 * Run: npx tsx scripts/migrate-to-hierarchy.ts
 * Or:  bun scripts/migrate-to-hierarchy.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'

const { Pool } = pkg

// Script-local client with logging disabled so connection errors show only our message
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: [],
})

async function main() {
  console.log('Starting hierarchy migration...')

  // Verify DB connection before proceeding
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    const code = (err as { code?: string })?.code
    const msg = err instanceof Error ? err.message : String(err)
    if (code === 'ECONNREFUSED' || msg.includes('ECONNREFUSED') || msg.toLowerCase().includes('connect')) {
      console.error('Cannot connect to the database. Check that:')
      console.error('  1. DATABASE_URL in .env is set and correct')
      console.error('  2. The database server is running and reachable (e.g. VPN, firewall, Supabase project active)')
      console.error('  3. Your IP is allowed if the DB uses IP allowlisting')
      process.exit(1)
    }
    throw err
  }

  let deptTeamUpdates = 0
  let teamUpdates = 0

  // 1. DepartmentTeam: members report to team lead
  const departmentTeams = await prisma.departmentTeam.findMany({
    where: { teamLeadId: { not: null } },
    include: { teamLead: true, members: true },
  })

  for (const dt of departmentTeams) {
    if (!dt.teamLeadId) continue
    for (const member of dt.members) {
      if (member.managerId === dt.teamLeadId) continue
      await prisma.employee.update({
        where: { id: member.id },
        data: { managerId: dt.teamLeadId },
      })
      deptTeamUpdates++
      console.log(`  DepartmentTeam: ${member.userId} -> manager ${dt.teamLeadId}`)
    }
  }

  console.log(`DepartmentTeam: ${deptTeamUpdates} employee(s) assigned manager from team lead.`)

  // 2. Team (sales): members report to sales head (need User -> Employee for both)
  const teams = await prisma.team.findMany({
    include: {
      salesHead: true,
      members: true,
    },
  })

  for (const team of teams) {
    const salesHeadEmployee = await prisma.employee.findUnique({
      where: { userId: team.salesHeadId },
    })
    if (!salesHeadEmployee) {
      console.warn(`  Team ${team.id}: sales head user ${team.salesHeadId} has no Employee record, skipping.`)
      continue
    }

    for (const memberUser of team.members) {
      if (memberUser.id === team.salesHeadId) continue // don't set head as own manager
      const memberEmployee = await prisma.employee.findUnique({
        where: { userId: memberUser.id },
      })
      if (!memberEmployee) {
        console.warn(`  Team ${team.id}: member user ${memberUser.id} has no Employee record, skipping.`)
        continue
      }
      if (memberEmployee.managerId === salesHeadEmployee.id) continue

      await prisma.employee.update({
        where: { id: memberEmployee.id },
        data: { managerId: salesHeadEmployee.id },
      })
      teamUpdates++
      console.log(`  Team: employee ${memberEmployee.id} -> manager (sales head) ${salesHeadEmployee.id}`)
    }
  }

  console.log(`Team (sales): ${teamUpdates} employee(s) assigned manager from sales head.`)

  console.log('Hierarchy migration complete.')
  console.log(`  Total updates: ${deptTeamUpdates + teamUpdates}`)
}

main()
  .catch((e) => {
    const code = (e as { code?: string })?.code
    if (code === 'ECONNREFUSED') {
      console.error('Database connection refused. Ensure DATABASE_URL is correct and the database is reachable.')
    } else {
      console.error(e)
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
