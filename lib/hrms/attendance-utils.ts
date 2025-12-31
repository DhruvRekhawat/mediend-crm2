import { AttendanceLog, PunchDirection } from '@prisma/client'

export interface AttendanceWithHours {
  date: Date
  inTime: Date | null
  outTime: Date | null
  workHours: number | null
  isLate: boolean
  logs: AttendanceLog[]
}

const WORK_START_HOUR = 11 // 11 AM

export function calculateWorkHours(inTime: Date, outTime: Date | null): number | null {
  if (!outTime) return null
  const diffMs = outTime.getTime() - inTime.getTime()
  return diffMs / (1000 * 60 * 60) // Convert to hours
}

export function isLateArrival(punchTime: Date): boolean {
  // IMPORTANT: No timezone conversions.
  // Attendance `logDate` is stored in UTC with the same clock-components as the device-provided IOTime.
  // So we must read hour/minute using UTC getters to preserve the original IOTime HH:mm.
  const punchHour = punchTime.getUTCHours()
  const punchMinute = punchTime.getUTCMinutes()
  return punchHour > WORK_START_HOUR || (punchHour === WORK_START_HOUR && punchMinute > 0)
}

export function groupAttendanceByDate(logs: AttendanceLog[]): AttendanceWithHours[] {
  const grouped = new Map<string, AttendanceWithHours>()

  for (const log of logs) {
    const dateKey = log.logDate.toISOString().split('T')[0]
    
    if (!grouped.has(dateKey)) {
      const [y, m, d] = dateKey.split('-').map(Number)
      grouped.set(dateKey, {
        date: new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)),
        inTime: null,
        outTime: null,
        workHours: null,
        isLate: false,
        logs: [],
      })
    }

    const day = grouped.get(dateKey)!
    day.logs.push(log)

    // IMPORTANT:
    // The biometric device/API can mislabel exit punches as IN.
    // So for each day we treat:
    // - inTime as the earliest punch of the day
    // - outTime as the latest punch of the day (only if there are at least 2 punches)
    if (!day.inTime || log.logDate < day.inTime) {
      day.inTime = log.logDate
      day.isLate = isLateArrival(log.logDate)
    }

    if (!day.outTime || log.logDate > day.outTime) {
      day.outTime = log.logDate
    }
  }

  // Calculate work hours for each day
  for (const day of grouped.values()) {
    // If only one punch exists, treat it as IN and keep OUT/workHours as null.
    // If multiple punches exist, OUT is the last punch and hours are positive.
    if (day.logs.length < 2) {
      day.outTime = null
      day.workHours = null
      continue
    }

    if (day.inTime && day.outTime) {
      day.workHours = calculateWorkHours(day.inTime, day.outTime)
    } else {
      day.workHours = null
    }
  }

  return Array.from(grouped.values()).sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  )
}

export function normalizePunchDirection(direction: string): PunchDirection {
  const normalized = direction.toLowerCase().trim()
  if (normalized === 'in' || normalized === '1') {
    return PunchDirection.IN
  }
  if (normalized === 'out' || normalized === '0') {
    return PunchDirection.OUT
  }
  // Default to IN if unclear
  return PunchDirection.IN
}

