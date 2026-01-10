import { Circle, PipelineStage, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

/**
 * MySQL Lead row structure (based on DESCRIBE lead output)
 */
export interface MySQLLeadRow {
  id: number
  month?: string | null
  Lead_Date: Date | string
  LeadEntryDate?: Date | string | null
  Patient_Number: string
  AlternativePhone?: string | null
  Whatsapp?: string | null
  Patient_Name: string
  PatientEmail?: string | null
  Age?: number | null
  Sex?: string | null
  Circle?: string | null
  address?: string | null
  doc_upload?: string | null
  Category?: string | null
  Treatment?: number | string | null
  DiseaseDetails?: string | null
  BDM?: string | null
  TL?: number | null
  remarks_id?: string | null
  Remarks?: string | null
  LastRemarks?: string | null
  Follow_up_Date?: Date | string | null
  Status?: string | null
  SubStatus?: number | null
  Surgery_Date?: Date | string | null
  OPD_Hospital?: string | null
  OPD_DrName?: string | null
  OPD_ContactNo?: string | null
  OPD_Charges?: number | null
  OPD_ScheduleDate?: Date | string | null
  OPD_Meeting?: number | null
  IPD_AdmisisonDate?: Date | string | null
  IPD_Hospital?: string | null
  IPD_DrName?: string | null
  IPD_ContactNo?: string | null
  IPD_TotalPayment?: number | null
  MOP?: string | null
  PaymentDetails?: number | null
  Attendant?: number | boolean | null
  AttendantName?: string | null
  AttendantContactNo?: string | null
  IPD_Details?: string | null
  WA_Format?: string | null
  Source?: number | null
  Lead_Source?: number | null
  WA_Message?: string | null
  Notification?: number | boolean | null
  city_option?: string | null
  email?: number | boolean | null
  sms?: number | boolean | null
  whatsapp_msg?: number | boolean | null
  create_by?: number | null
  create_date?: Date | string | null
  update_by?: number | null
  update_date?: Date | string | null
  ip?: string | null
  website?: string | null
  description?: string | null
  refid?: string | null
  DuplCount?: number | null
  aes?: number | boolean | null
  Profession?: string | null
  QR?: string | null
  RemoveRemarks?: number | boolean | null
  ad_id?: string | null
  campaign_id?: string | null
  form_id?: string | null
}

/**
 * Finds a BD user by name using multiple matching strategies
 */
async function findBDByName(name: string): Promise<{
  id: string
  circle: Circle | null
} | null> {
  if (!name) return null

  const trimmedName = name.trim()

  // Try multiple matching strategies
  // 1. Exact match (case-insensitive)
  let user = await prisma.user.findFirst({
    where: {
      role: UserRole.BD,
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
    include: {
      team: {
        select: {
          circle: true,
        },
      },
    },
  })

  if (user) {
    return {
      id: user.id,
      circle: user.team?.circle || null,
    }
  }

  // 2. Contains match (partial)
  user = await prisma.user.findFirst({
    where: {
      role: UserRole.BD,
      name: {
        contains: trimmedName,
        mode: 'insensitive',
      },
    },
    include: {
      team: {
        select: {
          circle: true,
        },
      },
    },
  })

  if (user) {
    return {
      id: user.id,
      circle: user.team?.circle || null,
    }
  }

  // 3. Try matching first name only (split by space)
  const firstName = trimmedName.split(' ')[0]
  if (firstName && firstName.length > 2) {
    user = await prisma.user.findFirst({
      where: {
        role: UserRole.BD,
        name: {
          startsWith: firstName,
          mode: 'insensitive',
        },
      },
      include: {
        team: {
          select: {
            circle: true,
          },
        },
      },
    })

    if (user) {
      return {
        id: user.id,
        circle: user.team?.circle || null,
      }
    }
  }

  return null
}

/**
 * Gets a default system user for createdById/updatedById
 */
async function getDefaultSystemUser(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  })
  if (admin) return admin.id

  const anyUser = await prisma.user.findFirst()
  if (anyUser) return anyUser.id

  throw new Error('No users found in system. Cannot process leads.')
}

/**
 * Creates a new BD user with default settings
 * Returns the user ID and circle
 */
async function createBDUser(
  name: string,
  systemUserId: string
): Promise<{ id: string; circle: Circle | null }> {
  // Generate email from name (lowercase, replace spaces with dots, handle special chars)
  const emailBase = name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
  let email = `${emailBase}@mediend.local`
  let counter = 1

  // Ensure unique email
  while (await prisma.user.findUnique({ where: { email } })) {
    email = `${emailBase}${counter}@mediend.local`
    counter++
  }

  // Get default team (first team available, or create one if none exists)
  let team = await prisma.team.findFirst()
  if (!team) {
    // Create a default team if none exists
    const salesHead = await prisma.user.findFirst({
      where: { role: UserRole.SALES_HEAD },
    })
    if (!salesHead) {
      throw new Error('No sales head found. Cannot create team for BD user.')
    }

    team = await prisma.team.create({
      data: {
        name: 'Default Team',
        circle: Circle.North,
        salesHeadId: salesHead.id,
      },
    })
  }

  // Create BD user
  const defaultPassword = await hashPassword('Temp@123') // Temporary password
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash: defaultPassword,
      name: name.trim(),
      role: UserRole.BD,
      teamId: team.id,
    },
    include: {
      team: {
        select: {
          circle: true,
        },
      },
    },
  })

  return {
    id: newUser.id,
    circle: newUser.team?.circle || null,
  }
}

/**
 * Parse date from MySQL format (handles both Date objects and strings)
 */
function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Parse boolean from MySQL (can be 0/1, true/false, etc.)
 */
function parseBoolean(value: number | boolean | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  return value === 1
}

/**
 * Map MySQL Circle string to Prisma Circle enum
 */
function mapCircle(circleStr: string | null | undefined): Circle {
  if (!circleStr) return Circle.North // Default
  
  const normalized = circleStr.trim()
  switch (normalized.toUpperCase()) {
    case 'NORTH':
      return Circle.North
    case 'SOUTH':
      return Circle.South
    case 'EAST':
      return Circle.East
    case 'WEST':
      return Circle.West
    case 'CENTRAL':
      return Circle.Central
    default:
      return Circle.North // Default fallback
  }
}

/**
 * Convert value to string, handling null/undefined
 */
function toString(value: any): string | null {
  if (value === null || value === undefined) return null
  return String(value)
}

/**
 * Convert value to integer, handling null/undefined
 */
function toInt(value: any): number | null {
  if (value === null || value === undefined) return null
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? null : parsed
}

/**
 * Maps MySQL lead row to Prisma Lead create/update data structure
 * @param autoCreateBD - If true, automatically create missing BD users
 */
export async function mapMySQLLeadToPrisma(
  mysqlRow: MySQLLeadRow,
  systemUserId: string,
  autoCreateBD: boolean = true
): Promise<{
  leadRef: string
  patientName: string
  age: number
  sex: string
  phoneNumber: string
  alternateNumber: string | null
  attendantName: string | null
  bdId: string
  status: string
  pipelineStage: PipelineStage
  circle: Circle
  city: string
  category: string | null
  treatment: string | null
  hospitalName: string
  createdById: string
  updatedById: string
  createdDate: Date
  updatedDate: Date | null
  [key: string]: any
}> {
  // Find BD user by name (BDM field might be a name or numeric ID)
  const bdmValue = mysqlRow.BDM ? String(mysqlRow.BDM).trim() : null
  if (!bdmValue) {
    throw new Error(`Lead ${mysqlRow.id} has no BDM specified`)
  }

  // Determine BDM name - if it's numeric, try both formats
  const isNumeric = /^\d+$/.test(bdmValue)
  let bdmName = bdmValue // Default to original value
  
  // Try finding BD user - check both numeric value and "BD-{number}" format
  let bdInfo = await findBDByName(bdmValue)
  
  // If numeric and not found, also try "BD-{number}" format
  if (!bdInfo && isNumeric) {
    bdmName = `BD-${bdmValue}`
    bdInfo = await findBDByName(bdmName)
    
    // If still not found and auto-create is enabled, create with "BD-{number}" format
    if (!bdInfo && autoCreateBD) {
      try {
        bdInfo = await createBDUser(bdmName, systemUserId)
        console.log(`Created new BD user: ${bdmName} (${bdInfo.id}) for lead ${mysqlRow.id}`)
      } catch (createError) {
        throw new Error(
          `Failed to create BD user ${bdmName} for lead ${mysqlRow.id}: ${
            createError instanceof Error ? createError.message : 'Unknown error'
          }`
        )
      }
    }
  } else if (!bdInfo && autoCreateBD) {
    // For non-numeric BDM values, try creating with the value as-is
    bdmName = bdmValue
    try {
      bdInfo = await createBDUser(bdmName, systemUserId)
      console.log(`Created new BD user: ${bdmName} (${bdInfo.id}) for lead ${mysqlRow.id}`)
    } catch (createError) {
      throw new Error(
        `Failed to create BD user ${bdmName} for lead ${mysqlRow.id}: ${
          createError instanceof Error ? createError.message : 'Unknown error'
        }`
      )
    }
  }

  if (!bdInfo) {
    throw new Error(
      `BD user not found: ${bdmName} for lead ${mysqlRow.id}. ${autoCreateBD ? 'Auto-creation failed.' : 'Enable auto-create to automatically create missing BD users.'}`
    )
  }

  const leadRef = String(mysqlRow.id)
  const leadDate = parseDate(mysqlRow.Lead_Date) || new Date()
  const updateDate = parseDate(mysqlRow.update_date)

  return {
    leadRef,
    patientName: mysqlRow.Patient_Name || 'Unknown',
    age: mysqlRow.Age ?? 0,
    sex: mysqlRow.Sex || 'Not Specified',
    phoneNumber: mysqlRow.Patient_Number || '0000000000',
    alternateNumber: toString(mysqlRow.AlternativePhone),
    attendantName: toString(mysqlRow.AttendantName),
    bdId: bdInfo.id,
    status: mysqlRow.Status || 'New Lead',
    pipelineStage: PipelineStage.SALES,
    circle: mysqlRow.Circle ? mapCircle(mysqlRow.Circle) : (bdInfo.circle || Circle.North),
    city: mysqlRow.city_option || 'Not Specified',
    category: toString(mysqlRow.Category),
    treatment: mysqlRow.Treatment ? String(mysqlRow.Treatment) : null,
    hospitalName: mysqlRow.OPD_Hospital || mysqlRow.IPD_Hospital || 'Not Specified',
    createdById: systemUserId,
    updatedById: systemUserId,
    createdDate: leadDate,
    updatedDate: updateDate || null,

    // Additional MySQL fields
    month: toString(mysqlRow.month),
    leadEntryDate: parseDate(mysqlRow.LeadEntryDate),
    patientEmail: toString(mysqlRow.PatientEmail),
    whatsapp: toString(mysqlRow.Whatsapp),
    address: toString(mysqlRow.address),
    docUpload: toString(mysqlRow.doc_upload),
    diseaseDetails: toString(mysqlRow.DiseaseDetails),
    followUpDate: parseDate(mysqlRow.Follow_up_Date),
    subStatus: toInt(mysqlRow.SubStatus),
    opdHospital: toString(mysqlRow.OPD_Hospital),
    opdDrName: toString(mysqlRow.OPD_DrName),
    opdContactNo: toString(mysqlRow.OPD_ContactNo),
    opdCharges: mysqlRow.OPD_Charges ?? 0,
    opdScheduleDate: parseDate(mysqlRow.OPD_ScheduleDate),
    opdMeeting: toInt(mysqlRow.OPD_Meeting),
    ipdAdmissionDate: parseDate(mysqlRow.IPD_AdmisisonDate),
    ipdHospital: toString(mysqlRow.IPD_Hospital),
    ipdDrName: toString(mysqlRow.IPD_DrName),
    ipdContactNo: toString(mysqlRow.IPD_ContactNo),
    ipdTotalPayment: mysqlRow.IPD_TotalPayment ?? 0,
    ipdDetails: toString(mysqlRow.IPD_Details),
    paymentDetails: toInt(mysqlRow.PaymentDetails),
    attendantContactNo: toString(mysqlRow.AttendantContactNo),
    waFormat: toString(mysqlRow.WA_Format),
    leadSource: toInt(mysqlRow.Lead_Source),
    whatsappMessage: toString(mysqlRow.WA_Message),
    notification: parseBoolean(mysqlRow.Notification),
    cityOption: toString(mysqlRow.city_option),
    emailSent: parseBoolean(mysqlRow.email),
    smsSent: parseBoolean(mysqlRow.sms),
    whatsappSent: parseBoolean(mysqlRow.whatsapp_msg),
    website: toString(mysqlRow.website),
    description: toString(mysqlRow.description),
    refId: toString(mysqlRow.refid),
    duplCount: mysqlRow.DuplCount ?? 0,
    aes: parseBoolean(mysqlRow.aes),
    profession: toString(mysqlRow.Profession),
    qr: toString(mysqlRow.QR),
    removeRemarks: parseBoolean(mysqlRow.RemoveRemarks),
    adId: toString(mysqlRow.ad_id),
    campaignId: toString(mysqlRow.campaign_id),
    formId: toString(mysqlRow.form_id),
    teamLeadId: toInt(mysqlRow.TL),
    remarksId: toString(mysqlRow.remarks_id),
    remarks: toString(mysqlRow.LastRemarks || mysqlRow.Remarks),
    source: mysqlRow.Source ? String(mysqlRow.Source) : 'mysql_sync',
    modeOfPayment: toString(mysqlRow.MOP),
    surgeryDate: parseDate(mysqlRow.Surgery_Date),
    // Note: Other fields like arrivalDate, conversionDate, etc. are set in Lead model defaults
  }
}
