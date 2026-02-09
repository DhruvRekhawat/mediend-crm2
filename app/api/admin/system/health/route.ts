import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request);
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return unauthorizedResponse("Unauthorized");
    }

    let dbStatus = "connected";
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = "disconnected";
      dbError = error instanceof Error ? error.message : "Unknown error";
    }

    const uptime = process.uptime();

    return successResponse({
      status: dbStatus === "connected" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      error: dbError,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}
