// External biometric API configuration
// API Endpoint: GET http://103.170.149.84:82/api/v2/WebAPI/GetDeviceLogs
// Query Params: APIKey, FromDate (YYYY-MM-DD), ToDate (YYYY-MM-DD)
// External biometric API configuration
// API Endpoint: GET http://103.170.149.84:82/api/v2/WebAPI/GetDeviceLogs
// Query Params: APIKey, FromDate (YYYY-MM-DD), ToDate (YYYY-MM-DD)
const BIOMETRIC_API_BASE_URL = process.env.BIOMETRIC_API_BASE_URL || 'http://103.170.149.84:82/api/v2/WebAPI'
const BIOMETRIC_API_KEY = process.env.BIOMETRIC_API_KEY || '153911112527'

export interface BiometricAttendanceLog {
  EmployeeCode: string
  LogDate: string
  SerialNumber: string
  PunchDirection: string
  Temperature: number
  TemperatureState: string
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
  // Construct URL with query parameters
  const url = new URL(`${BIOMETRIC_API_BASE_URL}/GetDeviceLogs`)
  url.searchParams.append('APIKey', BIOMETRIC_API_KEY)
  url.searchParams.append('FromDate', fromDate)
  url.searchParams.append('ToDate', toDate)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch attendance logs: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Handle both array and object responses
    if (Array.isArray(data)) {
      return data
    }
    
    // If response is an object, check for common data properties
    if (data.data && Array.isArray(data.data)) {
      return data.data
    }
    
    if (data.logs && Array.isArray(data.logs)) {
      return data.logs
    }
    
    // If it's an object with array-like structure, try to extract
    if (data.result && Array.isArray(data.result)) {
      return data.result
    }
    
    // Return empty array if no valid data structure found
    console.warn('Unexpected API response format:', data)
    return []
  } catch (error) {
    console.error('Error fetching attendance logs from biometric API:', error)
    throw error
  }
}

