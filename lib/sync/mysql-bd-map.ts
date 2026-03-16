import { prisma } from '@/lib/prisma'
import { UserRole } from '@/generated/prisma/client'

/**
 * Batch fetch all BD users and create a lookup map (includes Employee.bdNumber for numeric BDM lookups)
 */
export async function fetchBDUsersMap(): Promise<Map<string, { id: string; circle: string | null }>> {
  const [bdUsers, employeesWithBdNumber] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.BD },
      select: {
        id: true,
        name: true,
        team: { select: { circle: true } },
      },
    }),
    prisma.employee.findMany({
      where: { bdNumber: { not: null } },
      select: {
        bdNumber: true,
        userId: true,
        user: {
          select: {
            team: { select: { circle: true } },
          },
        },
      },
    }),
  ])

  const bdMap = new Map<string, { id: string; circle: string | null }>()

  for (const user of bdUsers) {
    const name = user.name.trim()
    const circle = user.team?.circle ?? null

    bdMap.set(name.toLowerCase(), { id: user.id, circle })

    const firstName = name.split(' ')[0]
    if (firstName && firstName.length > 2 && !bdMap.has(firstName.toLowerCase())) {
      bdMap.set(firstName.toLowerCase(), { id: user.id, circle })
    }

    if (/^\d+$/.test(name)) {
      bdMap.set(`bd-${name}`, { id: user.id, circle })
    }
  }

  for (const emp of employeesWithBdNumber) {
    if (emp.bdNumber != null) {
      const circle = emp.user?.team?.circle ?? null
      bdMap.set(String(emp.bdNumber), { id: emp.userId, circle })
      bdMap.set(`bd-${emp.bdNumber}`, { id: emp.userId, circle })
    }
  }

  return bdMap
}
