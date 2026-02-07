import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = getSessionFromRequest(request);
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const jobName = url.searchParams.get("jobName") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "100");

    const where: any = {};
    if (jobName) {
      where.jobName = jobName;
    }

    // Get recent logs
    const logs = await prisma.cronJobLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get last run for each job type
    const jobTypes = ["attendance_sync", "leads_sync", "log_cleanup"];
    const lastRuns = await Promise.all(
      jobTypes.map(async (job) => {
        const lastRun = await prisma.cronJobLog.findFirst({
          where: { jobName: job },
          orderBy: { createdAt: "desc" },
        });
        return { jobName: job, lastRun };
      })
    );

    return NextResponse.json({
      logs,
      lastRuns,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
