import { AttendanceLog, PunchDirection } from '@prisma/client'

export interface AttendanceWithHours {
  date: Date
  inTime: Date | null
  outTime: Date | null
  workHours: number | null
  isLate: boolean
  logs: AttendanceLog[]
}

const WORK_START_HOUR = 10 // 10 AM

export function calculateWorkHours(inTime: Date, outTime: Date | null): number | null {
  if (!outTime) return null
  const diffMs = outTime.getTime() - inTime.getTime()
  return diffMs / (1000 * 60 * 60) // Convert to hours
}

export function isLateArrival(punchTime: Date): boolean {
  const punchHour = punchTime.getHours()
  const punchMinute = punchTime.getMinutes()
  return punchHour > WORK_START_HOUR || (punchHour === WORK_START_HOUR && punchMinute > 0)
}

export function groupAttendanceByDate(logs: AttendanceLog[]): AttendanceWithHours[] {
  const grouped = new Map<string, AttendanceWithHours>()

  for (const log of logs) {
    const dateKey = log.logDate.toISOString().split('T')[0]
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        date: new Date(dateKey),
        inTime: null,
        outTime: null,
        workHours: null,
        isLate: false,
        logs: [],
      })
    }

    const day = grouped.get(dateKey)!
    day.logs.push(log)

    if (log.punchDirection === PunchDirection.IN) {
      if (!day.inTime || log.logDate < day.inTime) {
        day.inTime = log.logDate
        day.isLate = isLateArrival(log.logDate)
      }
    } else if (log.punchDirection === PunchDirection.OUT) {
      if (!day.outTime || log.logDate > day.outTime) {
        day.outTime = log.logDate
      }
    }
  }

  // Calculate work hours for each day
  for (const day of grouped.values()) {
    if (day.inTime && day.outTime) {
      day.workHours = calculateWorkHours(day.inTime, day.outTime)
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

