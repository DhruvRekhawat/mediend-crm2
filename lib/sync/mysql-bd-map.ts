import { prisma } from '@/lib/prisma'
import { UserRole } from '@/generated/prisma/client'

/**
 * Batch fetch all BD users and create a lookup map (includes Employee.bdNumber for numeric BDM lookups)
 */
export async function fetchBDUsersMap(): Promise<Map<string, { id: string }>> {
  const [bdUsers, employeesWithBdNumber] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.BD },
      select: { id: true, name: true },
    }),
    prisma.employee.findMany({
      where: { bdNumber: { not: null } },
      select: { bdNumber: true, userId: true },
    }),
  ])

  const bdMap = new Map<string, { id: string }>()

  for (const user of bdUsers) {
    const name = user.name.trim()
    const entry = { id: user.id }

    bdMap.set(name.toLowerCase(), entry)

    const firstName = name.split(' ')[0]
    if (firstName && firstName.length > 2 && !bdMap.has(firstName.toLowerCase())) {
      bdMap.set(firstName.toLowerCase(), entry)
    }

    if (/^\d+$/.test(name)) {
      bdMap.set(`bd-${name}`, entry)
    }
  }

  for (const emp of employeesWithBdNumber) {
    if (emp.bdNumber != null) {
      const entry = { id: emp.userId }
      bdMap.set(String(emp.bdNumber), entry)
      bdMap.set(`bd-${emp.bdNumber}`, entry)
    }
  }

  return bdMap
}
