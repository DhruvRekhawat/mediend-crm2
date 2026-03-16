import 'dotenv/config'
import { PrismaClient, CaseStage, UserRole, FlowType } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Helper to generate random Indian phone number
const randomPhone = () => '9' + Math.floor(100000000 + Math.random() * 900000000).toString()

// Helper to pick random element from array
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad']
const CIRCLES = ['North', 'West', 'South', 'South', 'South', 'West', 'East', 'West']
const HOSPITALS = ['Apollo Hospital', 'Fortis', 'Manipal', 'Max Healthcare', 'Medanta', 'Narayana Health', 'Aster CMI']
const TREATMENTS = ['ACL Surgery', 'Knee Replacement', 'Cataract', 'Rhinoplasty', 'Hernia Repair', 'Gallbladder Stone', 'Kidney Stone', 'Lasik']
const NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Kiara', 'Pari', 'Riya', 'Myra', 'Anvi', 'Aaradhya']
const SURNAMES = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Bhatia', 'Mehta', 'Jain', 'Agarwal', 'Singh', 'Patel', 'Reddy', 'Kumar', 'Das', 'Rao', 'Nair']

async function main() {
  console.log('🌱 Starting bulk leads seed...')

  // 1. Get or Create BD User
  let bdUser = await prisma.user.findUnique({
    where: { email: 'bd@mediend.com' },
  })

  if (!bdUser) {
    console.log('⚠️ BD user (bd@mediend.com) not found. Creating one...')
    bdUser = await prisma.user.create({
      data: {
        email: 'bd@mediend.com',
        passwordHash: '$2a$10$EpRnTzVlqHNP0.fkbpo9e.phSHhZ9.Zz.Zz.Zz.Zz.Zz.Zz.Zz', // dummy hash
        name: 'Sample BD',
        role: 'BD',
      },
    })
  }
  console.log(`✅ Using BD user: ${bdUser.email} (${bdUser.id})`)

  // 2. Get or Create Insurance User
  let insuranceUser = await prisma.user.findFirst({
    where: { role: 'INSURANCE_HEAD' },
  })

  if (!insuranceUser) {
    console.log('⚠️ No Insurance user found. Creating one...')
    insuranceUser = await prisma.user.create({
      data: {
        email: 'seed_insurance@mediend.com',
        passwordHash: '$2a$10$EpRnTzVlqHNP0.fkbpo9e.phSHhZ9.Zz.Zz.Zz.Zz.Zz.Zz.Zz', // dummy hash
        name: 'Seed Insurance',
        role: 'INSURANCE_HEAD',
      },
    })
  }
  console.log(`✅ Using Insurance user: ${insuranceUser.email} (${insuranceUser.id})`)

  const TOTAL_LEADS = 35 // Generating 35 leads to be safe

  for (let i = 0; i < TOTAL_LEADS; i++) {
    const firstName = pick(NAMES)
    const lastName = pick(SURNAMES)
    const cityIndex = Math.floor(Math.random() * CITIES.length)
    const city = CITIES[cityIndex]
    const circle = CIRCLES[cityIndex] as any // Cast to Circle enum if needed, but string works for create
    const hospital = pick(HOSPITALS)
    const treatment = pick(TREATMENTS)
    
    // Determine stage and flow type randomly but with distribution
    const rand = Math.random()
    let stage: CaseStage = CaseStage.NEW_LEAD
    let flowType: FlowType = FlowType.INSURANCE
    let status = 'Hot Lead'

    if (rand < 0.2) {
      stage = CaseStage.NEW_LEAD
    } else if (rand < 0.35) {
      stage = CaseStage.KYP_BASIC_COMPLETE
    } else if (rand < 0.5) {
      stage = CaseStage.HOSPITALS_SUGGESTED
    } else if (rand < 0.6) {
      stage = CaseStage.PREAUTH_RAISED
    } else if (rand < 0.7) {
      stage = CaseStage.PREAUTH_COMPLETE
    } else if (rand < 0.8) {
      stage = CaseStage.INITIATED // Admitted
    } else if (rand < 0.9) {
      // Cash Flow
      flowType = FlowType.CASH
      stage = pick([CaseStage.CASH_IPD_PENDING, CaseStage.CASH_IPD_SUBMITTED, CaseStage.CASH_APPROVED])
    } else {
      stage = CaseStage.DISCHARGED
    }

    const lead = await prisma.lead.create({
      data: {
        leadRef: `SEED-${i + 1}-${Date.now().toString().slice(-6)}`,
        patientName: `${firstName} ${lastName}`,
        age: 20 + Math.floor(Math.random() * 50),
        sex: Math.random() > 0.5 ? 'Male' : 'Female',
        phoneNumber: randomPhone(),
        circle,
        hospitalName: hospital,
        treatment,
        caseStage: stage,
        status,
        flowType,
        bdId: bdUser.id,
        createdById: bdUser.id,
        updatedById: bdUser.id,
      },
    })

    // Create related records based on stage
    if (stage !== CaseStage.NEW_LEAD && stage !== CaseStage.CASH_IPD_PENDING) {
      // Create KYP for non-new leads (even cash flow might have basic KYP conceptually, but strict flow might differ)
      // For simplicity, adding KYP to all progressed leads
      const kyp = await prisma.kYPSubmission.create({
        data: {
          leadId: lead.id,
          status: 'KYP_DETAILS_ADDED',
          submittedById: bdUser.id,
          aadhar: '1234' + Math.floor(Math.random() * 100000000),
          location: city,
        }
      })

      if (stage === CaseStage.HOSPITALS_SUGGESTED || stage === CaseStage.PREAUTH_RAISED || stage === CaseStage.PREAUTH_COMPLETE || stage === CaseStage.INITIATED || stage === CaseStage.DISCHARGED) {
        await prisma.preAuthorization.create({
          data: {
            kypSubmissionId: kyp.id,
            suggestedHospitals: {
              create: [
                { hospitalName: hospital, tentativeBill: 100000 + Math.floor(Math.random() * 50000) },
              ]
            },
            // If progressed further
            ...(stage !== CaseStage.HOSPITALS_SUGGESTED ? {
              requestedHospitalName: hospital,
              requestedRoomType: 'Private',
              diseaseDescription: treatment,
              preAuthRaisedAt: new Date(),
              preAuthRaisedById: bdUser.id,
              approvalStatus: stage === CaseStage.PREAUTH_RAISED ? 'PENDING' : 'APPROVED',
            } : {})
          }
        })
      }

      if (stage === CaseStage.INITIATED || stage === CaseStage.DISCHARGED) {
        await prisma.admissionRecord.create({
          data: {
            leadId: lead.id,
            admissionDate: new Date(),
            admissionTime: '10:00',
            admittingHospital: hospital,
            surgeryDate: new Date(),
            surgeryTime: '14:00',
            initiatedById: bdUser.id,
            ipdStatus: stage === CaseStage.DISCHARGED ? 'DISCHARGED' : 'ADMITTED_DONE'
          }
        })
      }
      
      if (stage === CaseStage.DISCHARGED) {
         await prisma.dischargeSheet.create({
            data: {
                leadId: lead.id,
                dischargeDate: new Date(),
                finalAmount: 150000,
                createdById: insuranceUser.id,
                status: 'DISCHARGED'
            }
         })
      }
    }
    
    // Cash Flow Specifics
    if (flowType === FlowType.CASH) {
        if (stage === CaseStage.CASH_IPD_SUBMITTED || stage === CaseStage.CASH_APPROVED) {
             await prisma.admissionRecord.create({
                data: {
                    leadId: lead.id,
                    admissionDate: new Date(),
                    admissionTime: '09:00',
                    admittingHospital: hospital,
                    surgeryDate: new Date(),
                    surgeryTime: '11:00',
                    initiatedById: bdUser.id,
                    notes: 'Cash flow admission'
                }
            })
        }
    }

    console.log(`✅ Created lead ${i + 1}/${TOTAL_LEADS}: ${lead.patientName} (${stage})`)
  }

  console.log('\n🎉 Bulk seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding leads:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
