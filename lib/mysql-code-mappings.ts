/**
 * MySQL Code Mappings
 * Maps numeric codes from MySQL database to their text values
 * Based on lead_codes.txt
 */

/**
 * Status code mappings (from MySQL status table)
 * Maps status ID to status text
 */
const STATUS_MAP: Record<string, string> = {
  '1': 'Follow-up 1',
  '2': 'Follow-up 2',
  '3': 'Follow-up 3',
  '4': 'DNP-1',
  '5': 'DNP-2',
  '6': 'DNP-3',
  '7': 'DNP-4',
  '8': 'DNP-5',
  '9': 'DNP Exhausted',
  '10': 'Fund Issues',
  '11': 'OPD Done',
  '12': 'OPD Schedule',
  '13': 'IPD Done',
  '14': 'IPD Schedule',
  '15': 'IPD Lost',
  '16': 'Out of Station',
  '17': 'Supply Gap',
  '18': 'Language Barrier',
  '19': 'Call Back (SD)',
  '20': 'Call Back (T)',
  '21': 'Call Back Next Week',
  '22': 'Call Back Next Month',
  '23': 'SX Not Suggested',
  '24': 'Order Booked',
  '25': 'Closed',
  '26': 'Junk',
  '27': 'New Lead',
  '28': 'Hot Lead',
  '29': 'Scan Done',
  '30': 'Call Done',
  '31': 'WA Done',
  '32': 'C/W Done',
  '33': 'Not Interested',
  '34': 'Duplicate lead',
  '35': 'Follow-up',
  '36': 'Invalid Number',
  '37': 'Nurture',
  '38': 'Policy Booked',
  '39': 'Interested',
  '40': 'Policy Issued',
  '41': 'Already Insured',
  '42': 'Out of station follow-up',
}

/**
 * Source code mappings (from MySQL source table)
 * Maps source ID to source text
 */
const SOURCE_MAP: Record<string, string> = {
  '1': 'Facebook',
  '2': 'Google',
  '3': 'Mixone',
  '4': 'Meta Marketplace',
  '5': 'LinkedIn',
  '6': 'Referral',
  '7': 'Competitor-C1',
  '8': 'Competitor-C',
  '9': 'ProData',
  '10': 'In bound call',
  '11': 'Instagram',
  '12': 'Organic-Lead',
  '13': 'Competitor-Ads-1',
  '14': 'Competitor-Ads-2',
  '15': 'Pro-Data-2',
  '16': 'Insurance',
  '17': 'Google Ads',
  '18': 'GP-AK-321',
  '19': 'SP182',
  '20': 'KVS290',
  '21': 'Offline',
  '22': 'Test',
  '23': 'Pt. Referral',
}

/**
 * Maps a status code to its text value
 * @param code - Status code (string number like "25") or text value
 * @returns Status text value, or original value if not found/not a code
 */
export function mapStatusCode(code: string | null | undefined): string {
  if (!code) return 'New'
  
  const trimmed = String(code).trim()
  
  // If it's a numeric code, try to map it
  if (/^\d+$/.test(trimmed)) {
    return STATUS_MAP[trimmed] || trimmed
  }
  
  // Otherwise, return the original value (might already be text)
  return trimmed
}

/**
 * Maps a source code to its text value
 * @param code - Source code (string number like "13") or text value
 * @returns Source text value, or original value if not found/not a code
 */
export function mapSourceCode(code: string | null | undefined): string | null {
  if (!code) return null
  
  const trimmed = String(code).trim()
  
  // If it's a numeric code, try to map it
  if (/^\d+$/.test(trimmed)) {
    return SOURCE_MAP[trimmed] || trimmed
  }
  
  // Otherwise, return the original value (might already be text)
  return trimmed
}

/**
 * Checks if a value is a numeric code that needs mapping
 * @param value - Value to check
 * @returns True if value is a numeric code
 */
export function isStatusCode(value: string | null | undefined): boolean {
  if (!value) return false
  return /^\d+$/.test(String(value).trim())
}

/**
 * Checks if a value is a numeric source code that needs mapping
 * @param value - Value to check
 * @returns True if value is a numeric code
 */
export function isSourceCode(value: string | null | undefined): boolean {
  if (!value) return false
  return /^\d+$/.test(String(value).trim())
}
