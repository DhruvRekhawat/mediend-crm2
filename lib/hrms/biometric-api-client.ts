import { ATTENDANCE_API_BASE_URL } from '@/lib/constants/api'

// API Credentials
const ATTENDANCE_API_USERNAME = process.env.ATTENDANCE_API_USERNAME || 'biomax'
const ATTENDANCE_API_PASSWORD = process.env.ATTENDANCE_API_PASSWORD || 'biomax'
const ATTENDANCE_DEVICE_KEY = process.env.ATTENDANCE_DEVICE_KEY || 'C263449807112E23'

// Token cache to avoid repeated logins
let cachedToken: string | null = null
let tokenExpiry: number = 0

export interface BiometricAttendanceLog {
  Id: number
  DeviceKey: string
  DeviceName: string
  UserId: string
  EmpCode: string
  UserName: string
  IOTime: string // ISO 8601 format
  IOMode: 'in' | 'out'
  VerifyMode: string
  WorkCode: string
  CreatedOn: string
  ImagePath: string
}

interface LoginResponse {
  Token: string
}

/**
 * Authenticates with the attendance API and returns a Bearer token
 * @returns Authentication token
 */
async function authenticate(): Promise<string> {
  // Return cached token if still valid (cache for 1 hour)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  try {
    const response = await fetch(`${ATTENDANCE_API_BASE_URL}/Auth/Login`, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Id: 0,
        Username: ATTENDANCE_API_USERNAME,
        Password: ATTENDANCE_API_PASSWORD,
        OldPassword: 'string',
        IsDeleted: false,
        RoleIds: [0],
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to authenticate: ${response.status} ${response.statusText}`)
    }

    const data: LoginResponse = await response.json()
    
    if (!data.Token) {
      throw new Error('No token received from authentication')
    }

    // Cache token for 1 hour
    cachedToken = data.Token
    tokenExpiry = Date.now() + 60 * 60 * 1000 // 1 hour

    return data.Token
  } catch (error) {
    console.error('Error authenticating with attendance API:', error)
    throw error
  }
}

/**
 * Fetches attendance logs from the external biometric API
 * @param fromDate Date in YYYY-MM-DD format
 * @param toDate Date in YYYY-MM-DD format
 * @returns Array of attendance logs
 */
export async function fetchAttendanceLogs(
  fromDate: string,
  toDate: string
): Promise<BiometricAttendanceLog[]> {
  try {
    // Authenticate first
    const token = await authenticate()

    // Construct URL with query parameters
    const url = new URL(`${ATTENDANCE_API_BASE_URL}/DeviceLog/GetAllLogsByDate`)
    url.searchParams.append('FromDate', fromDate)
    url.searchParams.append('ToDate', toDate)
    url.searchParams.append('DeviceKey', ATTENDANCE_DEVICE_KEY)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // If unauthorized, clear token cache and retry once
      if (response.status === 401) {
        cachedToken = null
        tokenExpiry = 0
        const newToken = await authenticate()
        const retryResponse = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'accept': '*/*',
            'Authorization': `Bearer ${newToken}`,
          },
        })
        
        if (!retryResponse.ok) {
          throw new Error(`Failed to fetch attendance logs: ${retryResponse.status} ${retryResponse.statusText}`)
        }
        
        const retryData = await retryResponse.json()
        return Array.isArray(retryData) ? retryData : []
      }
      
      throw new Error(`Failed to fetch attendance logs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // API returns an array directly
    if (Array.isArray(data)) {
      return data
    }
    
    // Return empty array if no valid data structure found
    console.warn('Unexpected API response format:', data)
    return []
  } catch (error) {
    console.error('Error fetching attendance logs from biometric API:', error)
    throw error
  }
}

