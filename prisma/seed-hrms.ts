import fs from "fs";
import { prisma } from '@/lib/prisma'

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

  console.log(`📊 Processing ${rawData.length} rows...`);

  /* ---------------- LEAVE TYPES ---------------- */
  console.log("\n📋 Setting up leave types...");
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
      console.log(`  ✓ Created leave type: ${lt.name}`);
    } else {
      console.log(`  → Leave type exists: ${lt.name}`);
    }
  }

  const leaveTypeMap = Object.fromEntries(
    (await prisma.leaveTypeMaster.findMany()).map(l => [l.name, l.id])
  );

  /* ---------------- CACHE FOR DEPARTMENTS AND TEAMS ---------------- */
  // Build in-memory cache to avoid duplicate lookups
  const departmentCache = new Map<string, string>(); // name -> id
  const teamCache = new Map<string, string>(); // "name|departmentId" -> id

  console.log("\n👥 Processing employees...");
  let processedCount = 0;
  let skippedCount = 0;

  /* ---------------- EMPLOYEES ---------------- */
  for (const row of rawData) {
    // Skip header row
    if (row["EMP ID"] === "EMP ID") {
      console.log("  → Skipping header row");
      continue;
    }

    const employeeCode = String(row["EMP ID"] || "").trim();
    if (!employeeCode) {
      skippedCount++;
      continue;
    }

    const departmentName = String(row["DEPT"] || "").trim();
    const teamName = String(row["TEAM"] || "").trim();
    const name = String(row["BDM"] || "").trim();
    const joinDate = String(row["DOJ"] || "").trim();
    const email = String(row["EMAIL ID"] || "").trim().toLowerCase();
    const mobile = String(row["MOBILE NUMBER"] || "").trim();

    // Skip rows without email
    if (!email) {
      console.log(`  ⚠️  No email for ${name} (${employeeCode}) - skipping`);
      skippedCount++;
      continue;
    }

    /* Department - find or create with cache */
    let departmentId: string | null = null;
    if (departmentName) {
      // Check cache first
      if (departmentCache.has(departmentName)) {
        departmentId = departmentCache.get(departmentName)!;
      } else {
        // Look up in database
        let department = await prisma.department.findFirst({
          where: { name: departmentName }
        });

        if (!department) {
          department = await prisma.department.create({
            data: { name: departmentName }
          });
          console.log(`  ✓ Created department: ${departmentName}`);
        }

        departmentId = department.id;
        departmentCache.set(departmentName, departmentId);
      }
    }

    /* Team - find or create with cache */
    let teamId: string | null = null;
    if (teamName && departmentId) {
      const cacheKey = `${teamName}|${departmentId}`;
      
      // Check cache first
      if (teamCache.has(cacheKey)) {
        teamId = teamCache.get(cacheKey)!;
      } else {
        // Look up in database
        let team = await prisma.departmentTeam.findFirst({
          where: {
            name: teamName,
            departmentId: departmentId
          }
        });

        if (!team) {
          team = await prisma.departmentTeam.create({
            data: {
              name: teamName,
              departmentId: departmentId
            }
          });
          console.log(`  ✓ Created team: ${teamName} in ${departmentName}`);
        }

        teamId = team.id;
        teamCache.set(cacheKey, teamId);
      }
    }

    /* Find User by email */
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`  ⚠️  No user found for email: ${email} (${name}, ${employeeCode})`);
      skippedCount++;
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
        console.log(`  ⚠️  Invalid join date for ${employeeCode}: ${joinDate}`);
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
            departmentId: departmentId,
            teamId: teamId
          }
        })
      : await prisma.employee.create({
          data: {
            employeeCode,
            userId: user.id,
            joinDate: parsedJoinDate,
            departmentId: departmentId,
            teamId: teamId
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

    processedCount++;
    if (processedCount % 10 === 0) {
      console.log(`  → Processed ${processedCount} employees...`);
    }
  }

  console.log("\n✅ HRMS JSON seed completed successfully");
  console.log(`📊 Summary:`);
  console.log(`   - Processed: ${processedCount} employees`);
  console.log(`   - Skipped: ${skippedCount} rows`);
  console.log(`   - Departments created/found: ${departmentCache.size}`);
  console.log(`   - Teams created/found: ${teamCache.size}`);
}

main()
  .catch((error) => {
    console.error("❌ Error during seed:", error);
    process.exit(1);
  })
  