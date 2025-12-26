/**
 * List Employees from Attendance API
 * 
 * This script fetches attendance logs and extracts unique employee names and codes.
 * Useful for matching API data with database employees.
 * Run: npx tsx scripts/list-attendance-employees.ts
 */

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { fetchAttendanceLogs } from '@/lib/hrms/biometric-api-client'
import { format, subDays } from 'date-fns'

async function listAttendanceEmployees() {
  try {
    // Fetch logs from the last 30 days to get a good sample
    const today = new Date()
    const fromDate = format(subDays(today, 30), 'yyyy-MM-dd')
    const toDate = format(today, 'yyyy-MM-dd')

    console.log(`📡 Fetching attendance logs from ${fromDate} to ${toDate}...`)
    const logs = await fetchAttendanceLogs(fromDate, toDate)
    console.log(`✅ Fetched ${logs.length} logs\n`)

    if (logs.length === 0) {
      console.log('ℹ️  No attendance logs found.')
      return
    }

    // Extract unique employees
    const employeeMap = new Map<string, { name: string; code: string; count: number }>()

    for (const log of logs) {
      const code = log.EmpCode?.trim() || 'N/A'
      const name = log.UserName?.trim() || 'N/A'
      
      const key = `${code}|${name}`
      
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          code,
          name,
          count: 0,
        })
      }
      
      employeeMap.get(key)!.count++
    }

    // Convert to array and sort by code
    const employees = Array.from(employeeMap.values()).sort((a, b) => {
      // Sort by code (numeric if possible, otherwise alphabetical)
      const aNum = parseInt(a.code)
      const bNum = parseInt(b.code)
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      
      return a.code.localeCompare(b.code)
    })

    console.log(`📋 Found ${employees.length} unique employees:\n`)
    console.log('┌─────────────┬─────────────────────────────────────────┬──────────┐')
    console.log('│ Employee Code│ Employee Name                           │ Log Count│')
    console.log('├─────────────┼─────────────────────────────────────────┼──────────┤')

    for (const emp of employees) {
      const code = emp.code.padEnd(11)
      const name = (emp.name.length > 39 ? emp.name.substring(0, 39) + '...' : emp.name).padEnd(39)
      const count = emp.count.toString().padStart(8)
      console.log(`│ ${code} │ ${name} │ ${count} │`)
    }

    console.log('└─────────────┴─────────────────────────────────────────┴──────────┘')

    // Also output as JSON for easy copying
    console.log('\n📄 JSON Format (for easy copying):\n')
    console.log(JSON.stringify(
      employees.map((e) => ({
        employeeCode: e.code,
        employeeName: e.name,
        logCount: e.count,
      })),
      null,
      2
    ))

    // CSV format
    console.log('\n📊 CSV Format:\n')
    console.log('Employee Code,Employee Name,Log Count')
    employees.forEach((emp) => {
      console.log(`"${emp.code}","${emp.name}",${emp.count}`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
listAttendanceEmployees()


