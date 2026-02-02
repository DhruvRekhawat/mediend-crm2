/**
 * SQL query validator - ensures security for raw SQL execution
 * Only allows read-only SELECT queries with strict validation
 */

const BLOCKED_PATTERNS = [
  /INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE/i,
  /passwordHash|password/i,
  /;.*SELECT/i, // Prevent SQL injection via semicolon
  /--|\/\*|\*\/|EXEC|EXECUTE|CALL/i, // SQL comments and execution
  /GRANT|REVOKE|DENY/i, // Permission changes
  /BACKUP|RESTORE/i, // Database operations
  /UNION.*SELECT/i, // Union-based injection attempts
]

const ALLOWED_TABLES = [
  'Lead',
  'Team',
  'User',
  'InsuranceCase',
  'PLRecord',
  'DischargeSheet',
  'OutstandingCase',
  'LedgerEntry',
  'KYPSubmission',
  'PreAuthorization',
  'Task',
  'Target',
  'Employee',
  'LeaveRequest',
  'PayrollRecord',
  'LeadStageEvent',
  'BonusRule',
  'Department',
  'DepartmentTeam',
  'AttendanceLog',
  'LeaveBalance',
  'PayrollComponent',
  'EmployeeDocument',
  'Feedback',
  'MDAppointment',
  'MentalHealthRequest',
  'SupportTicket',
  'IncrementRequest',
  'InternalJobPosting',
  'IJPApplication',
  'PartyMaster',
  'HeadMaster',
  'PaymentTypeMaster',
  'PaymentModeMaster',
  'LedgerAuditLog',
  'LocationMaster',
  'ItemMaster',
  'StockMovement',
  'PurchaseTransaction',
  'IssueTransaction',
  'LeadRemark',
  'Notification',
  'InsuranceQuery',
  'PreAuthPDF',
  'AdmissionRecord',
  'CaseStageHistory',
  'TaskDueDateApproval',
  'MDTaskTeam',
  'MDTaskTeamMember',
  'WorkLog',
]

const MAX_ROWS = 100
const QUERY_TIMEOUT_MS = 5000

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitizedQuery?: string
}

/**
 * Validates and sanitizes SQL query for safe execution
 */
export function validateSQLQuery(query: string): ValidationResult {
  // Trim and normalize whitespace
  const trimmed = query.trim()
  
  // Must start with SELECT
  if (!trimmed.match(/^\s*SELECT/i)) {
    return {
      valid: false,
      error: 'Only SELECT queries are allowed',
    }
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: `Query contains blocked pattern: ${pattern.source}`,
      }
    }
  }

  // Ensure query references only allowed tables
  // Extract table names from FROM/JOIN clauses
  const tableMatches = trimmed.match(/(?:FROM|JOIN)\s+(\w+)/gi)
  if (tableMatches) {
    const tables = tableMatches.map(match => {
      const tableName = match.replace(/(?:FROM|JOIN)\s+/i, '').trim()
      return tableName
    })

    for (const table of tables) {
      if (!ALLOWED_TABLES.includes(table)) {
        return {
          valid: false,
          error: `Table "${table}" is not allowed. Allowed tables: ${ALLOWED_TABLES.slice(0, 10).join(', ')}...`,
        }
      }
    }
  }

  // Add LIMIT if not present (safety measure)
  let sanitizedQuery = trimmed
  if (!trimmed.match(/\bLIMIT\s+\d+/i)) {
    sanitizedQuery = `${trimmed} LIMIT ${MAX_ROWS}`
  } else {
    // Ensure LIMIT doesn't exceed max
    const limitMatch = trimmed.match(/\bLIMIT\s+(\d+)/i)
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10)
      if (limit > MAX_ROWS) {
        sanitizedQuery = trimmed.replace(/\bLIMIT\s+\d+/i, `LIMIT ${MAX_ROWS}`)
      }
    }
  }

  return {
    valid: true,
    sanitizedQuery,
  }
}

export { MAX_ROWS, QUERY_TIMEOUT_MS, ALLOWED_TABLES }
