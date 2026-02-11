'use client'

import { useMemo } from 'react'
import { eachDayOfInterval, format, getDay } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AttendanceDay {
  date: Date
  inTime: Date | null
  outTime: Date | null
  isLate: boolean
}

interface AttendanceHeatmapProps {
  attendance: AttendanceDay[]
  fromDate: string // YYYY-MM-DD format
  toDate: string // YYYY-MM-DD format
}

function formatTime(date: Date | string | null) {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export function AttendanceHeatmap({ attendance, fromDate, toDate }: AttendanceHeatmapProps) {
  // Create a map of attendance by date string (YYYY-MM-DD)
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceDay>()
    attendance.forEach((day) => {
      const dateKey = format(new Date(day.date), 'yyyy-MM-dd')
      map.set(dateKey, day)
    })
    return map
  }, [attendance])

  // Generate all dates in the range
  const allDates = useMemo(() => {
    const [startYear, startMonth, startDay] = fromDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = toDate.split('-').map(Number)
    const start = new Date(startYear, startMonth - 1, startDay)
    const end = new Date(endYear, endMonth - 1, endDay)
    return eachDayOfInterval({ start, end })
  }, [fromDate, toDate])

  // Process each date to determine cell color and status
  const heatmapCells = useMemo(() => {
    return allDates.map((date) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      const dayOfWeek = getDay(date)
      const isSunday = dayOfWeek === 0
      const attendanceRecord = attendanceMap.get(dateKey)

      let status: 'present' | 'late' | 'absent' | 'holiday'
      let bgColor: string
      let textColor: string
      let tooltipText: string

      if (isSunday) {
        status = 'holiday'
        bgColor = 'bg-purple-300'
        textColor = 'text-purple-900'
        tooltipText = `${format(date, 'PPP')} - Sunday (Holiday)`
      } else if (attendanceRecord) {
        if (attendanceRecord.isLate) {
          status = 'late'
          bgColor = 'bg-yellow-500'
          textColor = 'text-white'
          tooltipText = `${format(date, 'PPP')} - Late\nEntry: ${formatTime(attendanceRecord.inTime)}\nExit: ${formatTime(attendanceRecord.outTime)}`
        } else {
          status = 'present'
          bgColor = 'bg-green-500'
          textColor = 'text-white'
          tooltipText = `${format(date, 'PPP')} - Present\nEntry: ${formatTime(attendanceRecord.inTime)}\nExit: ${formatTime(attendanceRecord.outTime)}`
        }
      } else {
        status = 'absent'
        bgColor = 'bg-gray-200'
        textColor = 'text-gray-500'
        tooltipText = `${format(date, 'PPP')} - Absent`
      }

      return {
        date,
        dateKey,
        status,
        bgColor,
        textColor,
        tooltipText,
        dayAbbr: format(date, 'EEE').slice(0, 3), // Mon, Tue, etc.
        dateNum: format(date, 'd'), // Day number
        fullDate: format(date, 'PPP'),
      }
    })
  }, [allDates, attendanceMap])

  if (heatmapCells.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No dates in selected range
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row with full dates */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="inline-flex gap-1 min-w-fit">
          {heatmapCells.map((cell) => (
            <div
              key={cell.dateKey}
              className="w-12 text-center text-xs text-muted-foreground font-medium shrink-0"
            >
              {format(cell.date, 'MMM d')}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap row */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="inline-flex gap-1 min-w-fit">
          <TooltipProvider>
            {heatmapCells.map((cell) => (
              <Tooltip key={cell.dateKey}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-md flex flex-col items-center justify-center text-xs font-medium transition-colors cursor-pointer hover:opacity-80 shrink-0',
                      cell.bgColor,
                      cell.textColor
                    )}
                  >
                    <span className="text-[10px] opacity-80">{cell.dayAbbr}</span>
                    <span className="font-semibold text-sm">{cell.dateNum}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="whitespace-pre-line text-sm">{cell.tooltipText}</div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200"></div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-300"></div>
          <span>Holiday</span>
        </div>
      </div>
    </div>
  )
}
