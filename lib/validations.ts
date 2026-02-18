export const AADHAAR_REGEX = /^[2-9]{1}[0-9]{11}$/
export const PAN_REGEX = /^[A-Z]{3}[PCHFATBLJG]{1}[A-Z]{1}[0-9]{4}[A-Z]{1}$/

export function validateAadhaar(aadhar: string): boolean {
  if (!aadhar) return true // Optional fields
  return AADHAAR_REGEX.test(aadhar)
}

export function validatePAN(pan: string): boolean {
  if (!pan) return true // Optional fields
  return PAN_REGEX.test(pan.toUpperCase())
}
