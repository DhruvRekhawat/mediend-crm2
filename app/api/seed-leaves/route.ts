import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { hash } from 'bcryptjs';

// Helper to parse dates like "16-Dec-24" or "06-May-25" or "06-11-2025"
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // Handle "dd-MM-yyyy" format (e.g. "06-11-2025")
  if (dateStr.includes('-') && dateStr.split('-')[2].length === 4 && !isNaN(Number(dateStr.split('-')[1]))) {
      const parts = dateStr.split('-');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }

  // Handle "dd-MMM-yy" format (e.g. "16-Dec-24")
  const months: { [key: string]: number } = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const monthStr = parts[1];
  let year = parseInt(parts[2]);

  // Adjust year for 2-digit years
  if (year < 100) {
    year += 2000;
  }

  const month = months[monthStr];
  
  if (month === undefined) return null;

  return new Date(year, month, day);
}

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), 'app', 'deepseek_json_20260218_2ecd2a.json');
    const fileContents = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContents);

    const results = {
      processed: 0,
      createdUsers: 0,
      updatedLeaves: 0,
      errors: [] as string[]
    };

    // 1. Ensure Leave Types exist
    const leaveTypes = ['CL', 'SL', 'EL'];
    const leaveTypeMap: { [key: string]: string } = {};

    for (const type of leaveTypes) {
      let leaveType = await prisma.leaveTypeMaster.findUnique({
        where: { name: type }
      });

      if (!leaveType) {
        leaveType = await prisma.leaveTypeMaster.create({
          data: {
            name: type,
            maxDays: 12, // Default, can be adjusted
            isActive: true
          }
        });
      }
      leaveTypeMap[type] = leaveType.id;
    }

    // 2. Process each record
    for (const record of data) {
      try {
        results.processed++;
        const empId = String(record.EMP_ID);
        const name = record.BDM;
        const deptName = record.DEPT;
        const doj = parseDate(record.DOJ);

        // Find or create Department
        let department = await prisma.department.findFirst({
          where: { name: deptName }
        });

        if (!department) {
          department = await prisma.department.create({
            data: { name: deptName }
          });
        }

        // Find or create User/Employee
        let employee = await prisma.employee.findUnique({
          where: { employeeCode: empId },
          include: { user: true }
        });

        if (!employee) {
          // Check if user exists by email to avoid unique constraint error
          const email = `${empId}@mediend.com`.toLowerCase();
          let user = await prisma.user.findUnique({
            where: { email }
          });

          if (!user) {
            const hashedPassword = await hash('password', 10);
            user = await prisma.user.create({
              data: {
                email,
                name: name,
                passwordHash: hashedPassword,
                role: 'USER', // Default role
              }
            });
            results.createdUsers++;
          }

          employee = await prisma.employee.create({
            data: {
              employeeCode: empId,
              userId: user.id,
              departmentId: department.id,
              joinDate: doj,
            },
            include: { user: true }
          });
        } else {
            // Update DOJ if missing
            if (!employee.joinDate && doj) {
                await prisma.employee.update({
                    where: { id: employee.id },
                    data: { joinDate: doj }
                });
            }
        }

        // Update Leave Balances
        const balances = [
          { type: 'CL', amount: record.Final_CL },
          { type: 'SL', amount: record.Final_SL },
          { type: 'EL', amount: record.Final_EL }
        ];

        for (const balance of balances) {
          if (balance.amount !== undefined && balance.amount !== null) {
            const leaveTypeId = leaveTypeMap[balance.type];
            
            await prisma.leaveBalance.upsert({
              where: {
                employeeId_leaveTypeId: {
                  employeeId: employee.id,
                  leaveTypeId: leaveTypeId
                }
              },
              create: {
                employeeId: employee.id,
                leaveTypeId: leaveTypeId,
                allocated: parseFloat(balance.amount),
                used: 0,
                remaining: parseFloat(balance.amount)
              },
              update: {
                allocated: parseFloat(balance.amount),
                remaining: parseFloat(balance.amount) // Resetting remaining to final amount as per requirement implies this is the current standing
              }
            });
          }
        }
        results.updatedLeaves++;

      } catch (err: any) {
        console.error(`Error processing record for EMP_ID ${record.EMP_ID}:`, err);
        results.errors.push(`EMP_ID ${record.EMP_ID}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
