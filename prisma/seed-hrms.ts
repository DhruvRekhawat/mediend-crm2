import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

type EmployeeRow = {
  "EMP ID": string | number;
  "BDM": string;
  "DEPT": string;
  "DOJ": string;
  "EMAIL ID": string;
  "MOBILE NUMBER": string | number;
  "TEAM": string;
  "CL_FINAL": string | number;
  "SL_FINAL": string | number;
  "EL_FINAL": string | number;
  "Employee": string;
};

async function main() {
  const rawData: EmployeeRow[] = JSON.parse(
    fs.readFileSync("prisma/employee-json.json", "utf-8")
  );

  /* ---------------- LEAVE TYPES ---------------- */
  const leaveTypes = [
    { name: "CL", maxDays: 12 },
    { name: "SL", maxDays: 12 },
    { name: "EL", maxDays: 18 }
  ];

  for (const lt of leaveTypes) {
    const existing = await prisma.leaveTypeMaster.findUnique({
      where: { name: lt.name }
    });
    
    if (!existing) {
      await prisma.leaveTypeMaster.create({
        data: lt
      });
    }
  }

  const leaveTypeMap = Object.fromEntries(
    (await prisma.leaveTypeMaster.findMany()).map(l => [l.name, l.id])
  );

  /* ---------------- EMPLOYEES ---------------- */
  for (const row of rawData) {
    // Skip header row
    if (row["EMP ID"] === "EMP ID") {
      continue;
    }

    const employeeCode = String(row["EMP ID"] || "").trim();
    if (!employeeCode) continue;

    const departmentName = String(row["DEPT"] || "").trim();
    const teamName = String(row["TEAM"] || "").trim();
    const name = String(row["BDM"] || "").trim();
    const joinDate = String(row["DOJ"] || "").trim();
    const email = String(row["EMAIL ID"] || "").trim().toLowerCase();
    const mobile = String(row["MOBILE NUMBER"] || "").trim();

    // Skip rows without email
    if (!email) {
      console.warn(
        `⚠️ No email for Employee: ${name}, ID: ${employeeCode} - skipping`
      );
      continue;
    }

    /* Department - find or create */
    let department = null;
    if (departmentName) {
      department = await prisma.department.findFirst({
        where: { name: departmentName }
      });

      if (!department) {
        department = await prisma.department.create({
          data: { name: departmentName }
        });
      }
    }

    /* Team - find or create */
    let team = null;
    if (teamName && department) {
      team = await prisma.departmentTeam.findFirst({
        where: {
          name: teamName,
          departmentId: department.id
        }
      });

      if (!team) {
        team = await prisma.departmentTeam.create({
          data: {
            name: teamName,
            departmentId: department.id
          }
        });
      }
    }

    /* Find User by email */
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.warn(
        `⚠️ No user found for email: ${email} (Employee: ${name}, ID: ${employeeCode})`
      );
      continue;
    }

    /* Patch user name if missing or generic */
    if (!user.name || user.name === "User") {
      await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    /* Parse join date - handle empty strings and various formats */
    let parsedJoinDate: Date | null = null;
    if (joinDate && joinDate.trim()) {
      try {
        parsedJoinDate = new Date(joinDate);
        // Check if date is valid
        if (isNaN(parsedJoinDate.getTime())) {
          parsedJoinDate = null;
        }
      } catch (e) {
        console.warn(`⚠️ Invalid join date for ${employeeCode}: ${joinDate}`);
        parsedJoinDate = null;
      }
    }

    /* Employee upsert */
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeCode }
    });

    const employee = existingEmployee
      ? await prisma.employee.update({
          where: { employeeCode },
          data: {
            departmentId: department?.id || null,
            teamId: team?.id || null
          }
        })
      : await prisma.employee.create({
          data: {
            employeeCode,
            userId: user.id,
            joinDate: parsedJoinDate,
            departmentId: department?.id || null,
            teamId: team?.id || null
          }
        });

    /* Leave balances */
    const parseLeaveValue = (value: string | number): number => {
      if (value === "" || value === null || value === undefined) {
        return 0;
      }
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : parsed;
    };

    const leaves = [
      { type: "CL", remaining: parseLeaveValue(row["CL_FINAL"]) },
      { type: "SL", remaining: parseLeaveValue(row["SL_FINAL"]) },
      { type: "EL", remaining: parseLeaveValue(row["EL_FINAL"]) }
    ];

    for (const { type, remaining } of leaves) {
      if (!leaveTypeMap[type]) continue;

      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: leaveTypeMap[type]
          }
        }
      });

      if (existingBalance) {
        await prisma.leaveBalance.update({
          where: {
            employeeId_leaveTypeId: {
              employeeId: employee.id,
              leaveTypeId: leaveTypeMap[type]
            }
          },
          data: {
            remaining,
            allocated: remaining
          }
        });
      } else {
        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveTypeMap[type],
            allocated: remaining,
            used: 0,
            remaining
          }
        });
      }
    }

    console.log(`✓ Processed employee: ${name} (${employeeCode})`);
  }

  console.log("✅ HRMS JSON seed completed successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());