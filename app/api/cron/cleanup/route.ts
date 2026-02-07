import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron cleanup job
 * Called by system cron daily at 3 AM UTC
 * Deletes old logs:
 * - RequestLog entries older than 7 days
 * - CronJobLog entries older than 30 days
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobName = "log_cleanup";

  try {
    // Authenticate
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Delete old request logs (7 days)
    const deletedRequestLogs = await prisma.requestLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    // Delete old cron job logs (30 days)
    const deletedCronLogs = await prisma.cronJobLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    const durationMs = Date.now() - startTime;
    const totalDeleted = deletedRequestLogs.count + deletedCronLogs.count;

    // Log this cleanup job
    await prisma.cronJobLog.create({
      data: {
        jobName,
        status: "success",
        durationMs,
        recordsProcessed: totalDeleted,
        message: `Deleted ${deletedRequestLogs.count} request logs and ${deletedCronLogs.count} cron logs`,
      },
    });

    return NextResponse.json({
      success: true,
      jobName,
      durationMs,
      deletedRequestLogs: deletedRequestLogs.count,
      deletedCronLogs: deletedCronLogs.count,
      totalDeleted,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log error
    await prisma.cronJobLog.create({
      data: {
        jobName,
        status: "error",
        durationMs,
        recordsProcessed: 0,
        message: "Cleanup job failed",
        error: errorMessage,
      },
    });

    return NextResponse.json(
      { error: errorMessage, jobName, durationMs },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
