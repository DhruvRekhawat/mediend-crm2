import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { UserRole } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = getSessionFromRequest(request);
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deployCommit = process.env.DEPLOY_COMMIT || "unknown";
    const deployTime = process.env.DEPLOY_TIME || "unknown";

    return NextResponse.json({
      commit: deployCommit,
      time: deployTime,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
