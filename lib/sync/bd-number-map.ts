/**
 * BD number (legacy MySQL lead.BDM) -> User id mapping.
 * Reads Employee.bdNumber from the database (populated by seed-employees-from-json).
 * Used by mysql-lead-mapper when BDM is numeric.
 */

import { prisma } from '@/lib/prisma'

let cached: Map<string, string> | null = null

async function loadMap(): Promise<Map<string, string>> {
  if (cached !== null) return cached

  const employees = await prisma.employee.findMany({
    where: { bdNumber: { not: null } },
    select: { bdNumber: true, userId: true },
  })

  cached = new Map<string, string>()
  for (const emp of employees) {
    if (emp.bdNumber !== null) {
      cached.set(String(emp.bdNumber), emp.userId)
    }
  }
  return cached
}

/**
 * Resolve legacy BD number to User id. Returns null if not found.
 */
export async function getUserIdByBdNumber(bdNumber: number | string): Promise<string | null> {
  const key = String(bdNumber).trim()
  if (!key) return null
  const map = await loadMap()
  return map.get(key) ?? null
}

/** Bust the in-memory cache (e.g. after re-seeding). */
export function clearBdNumberCache(): void {
  cached = null
}
