/**
 * Helpers for matching biometric API rows (EmpCode, IOTime) to CRM employees and stored timestamps.
 */

/**
 * Parses biometric `IOTime` — wall-clock time from the device. No timezone conversion;
 * returns a UTC Date with the same Y-M-D H:m:s components for storage.
 */
export function parseBiometricIOTime(iotime: string): Date | null {
  const iotimeMatch = iotime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
  if (!iotimeMatch) return null
  const [, year, month, day, hour, minute, second] = iotimeMatch.map(Number)
  const logDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (isNaN(logDate.getTime())) return null
  return logDate
}

/**
 * Resolves employee id from raw `EmpCode` using the same flexible keys as sync routes
 * (exact, trimmed, lower-case, numeric normalization).
 */
export function resolveEmployeeId(
  rawEmpCode: string,
  employeeCodeMap: Map<string, string>
): string | undefined {
  const raw = rawEmpCode?.trim() ?? ''
  if (!raw || raw === '0') return undefined
  return (
    employeeCodeMap.get(raw) ??
    employeeCodeMap.get(raw.toLowerCase()) ??
    (!isNaN(Number(raw)) ? employeeCodeMap.get(String(Number(raw))) : undefined)
  )
}

/**
 * Builds a lookup map from `employeeCode` with extra keys (trim, lower, numeric) for device quirks.
 */
export function buildBiometricEmployeeCodeMap(
  employees: ReadonlyArray<{ id: string; employeeCode: string | null }>
): Map<string, string> {
  const employeeCodeMap = new Map<string, string>()
  for (const e of employees) {
    const code = e.employeeCode
    if (!code) continue
    employeeCodeMap.set(code, e.id)
    const trimmed = code.trim()
    if (trimmed !== code) employeeCodeMap.set(trimmed, e.id)
    const lower = code.toLowerCase()
    if (lower !== code) employeeCodeMap.set(lower, e.id)
    const num = String(Number(code))
    if (num !== 'NaN' && num !== code) employeeCodeMap.set(num, e.id)
  }
  return employeeCodeMap
}
