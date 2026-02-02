import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/session'
import { unauthorizedResponse, errorResponse, successResponse } from '@/lib/api-utils'
import { validateSQLQuery, MAX_ROWS, QUERY_TIMEOUT_MS } from '@/lib/ai/sql-validator'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = getSessionFromRequest(req)
    if (!user) {
      return unauthorizedResponse('Please log in to execute SQL queries')
    }

    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return errorResponse('Query parameter is required', 400)
    }

    // Validate SQL query
    const validation = validateSQLQuery(query)
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid SQL query', 400)
    }

    const sanitizedQuery = validation.sanitizedQuery || query

    // Execute query with timeout
    const queryPromise = prisma.$queryRawUnsafe(sanitizedQuery)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT_MS)
    })

    let results
    try {
      results = await Promise.race([queryPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'Query timeout') {
        return errorResponse('Query execution timed out', 408)
      }
      throw error
    }

    // Ensure results are serializable
    const serializedResults = JSON.parse(JSON.stringify(results))

    // Limit results if needed
    const limitedResults = Array.isArray(serializedResults)
      ? serializedResults.slice(0, MAX_ROWS)
      : serializedResults

    return successResponse({
      query: sanitizedQuery,
      results: limitedResults,
      rowCount: Array.isArray(limitedResults) ? limitedResults.length : 1,
      maxRows: MAX_ROWS,
    })
  } catch (error) {
    console.error('Error executing SQL query:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to execute SQL query',
      500
    )
  }
}
