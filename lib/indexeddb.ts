import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface MediendDB extends DBSchema {
  leads: {
    key: string
    value: {
      key: string
      data: any
      timestamp: number
    }
    indexes: { 'by-timestamp': number }
  }
  analytics: {
    key: string
    value: {
      key: string
      data: any
      timestamp: number
    }
    indexes: { 'by-timestamp': number }
  }
  filters: {
    key: string
    value: {
      key: string
      data: any
      timestamp: number
    }
  }
}

let dbInstance: IDBPDatabase<MediendDB> | null = null

export async function getDB(): Promise<IDBPDatabase<MediendDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<MediendDB>('mediend-crm', 1, {
    upgrade(db) {
      // Leads store
      if (!db.objectStoreNames.contains('leads')) {
        const leadsStore = db.createObjectStore('leads', { keyPath: 'key' })
        leadsStore.createIndex('by-timestamp', 'timestamp')
      }

      // Analytics store
      if (!db.objectStoreNames.contains('analytics')) {
        const analyticsStore = db.createObjectStore('analytics', { keyPath: 'key' })
        analyticsStore.createIndex('by-timestamp', 'timestamp')
      }

      // Filters store
      if (!db.objectStoreNames.contains('filters')) {
        db.createObjectStore('filters', { keyPath: 'key' })
      }
    },
  })

  return dbInstance
}

export async function cacheLeads(key: string, data: any): Promise<void> {
  const db = await getDB()
  await db.put('leads', {
    key,
    data,
    timestamp: Date.now(),
  })
}

export async function getCachedLeads(key: string): Promise<any | null> {
  const db = await getDB()
  const cached = await db.get('leads', key)
  if (!cached) return null

  // Cache expires after 5 minutes
  const CACHE_TTL = 5 * 60 * 1000
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await db.delete('leads', key)
    return null
  }

  return cached.data
}

export async function cacheAnalytics(key: string, data: any): Promise<void> {
  const db = await getDB()
  await db.put('analytics', {
    key,
    data,
    timestamp: Date.now(),
  })
}

export async function getCachedAnalytics(key: string): Promise<any | null> {
  const db = await getDB()
  const cached = await db.get('analytics', key)
  if (!cached) return null

  // Cache expires after 10 minutes
  const CACHE_TTL = 10 * 60 * 1000
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    await db.delete('analytics', key)
    return null
  }

  return cached.data
}

export async function saveFilters(key: string, filters: any): Promise<void> {
  const db = await getDB()
  await db.put('filters', {
    key,
    data: filters,
    timestamp: Date.now(),
  })
}

export async function getFilters(key: string): Promise<any | null> {
  const db = await getDB()
  const cached = await db.get('filters', key)
  return cached?.data || null
}

export async function clearCache(): Promise<void> {
  const db = await getDB()
  await db.clear('leads')
  await db.clear('analytics')
}

