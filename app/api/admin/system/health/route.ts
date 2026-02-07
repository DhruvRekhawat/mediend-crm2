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

    // Check database connectivity
    let dbStatus = "connected";
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = "disconnected";
      dbError = error instanceof Error ? error.message : "Unknown error";
    }

    // Get app uptime
    const uptime = process.uptime();

    return NextResponse.json({
      status: dbStatus === "connected" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      error: dbError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 500 }
    );
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}
