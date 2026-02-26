/**
 * BD number (legacy MySQL lead.BDM) -> User id mapping.
 * Populated by scripts/seed-employees-from-json.ts; used by MySQL lead mapper when BDM is numeric.
 */

import * as fs from 'fs'
import * as path from 'path'

const BD_MAP_PATH = path.join(process.cwd(), 'lib', 'sync', 'bd-number-to-user-id.json')

let cached: Record<string, string> | null = null

function loadMap(): Record<string, string> {
  if (cached !== null) return cached
  try {
    if (fs.existsSync(BD_MAP_PATH)) {
      const raw = fs.readFileSync(BD_MAP_PATH, 'utf-8')
      cached = JSON.parse(raw) as Record<string, string>
    } else {
      cached = {}
    }
  } catch {
    cached = {}
  }
  return cached
}

/**
 * Resolve legacy BD number to User id. Returns null if not in map or file missing.
 */
export function getUserIdByBdNumber(bdNumber: number | string): string | null {
  const key = String(bdNumber).trim()
  if (!key) return null
  const map = loadMap()
  return map[key] ?? null
}

/**
 * Async form for consistency with callers that prefer Promise.
 */
export async function getUserIdByBdNumberAsync(bdNumber: number | string): Promise<string | null> {
  return Promise.resolve(getUserIdByBdNumber(bdNumber))
}
