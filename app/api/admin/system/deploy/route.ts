import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { UserRole } from "@prisma/client";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const user = getSessionFromRequest(request);
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return unauthorizedResponse("Unauthorized");
    }

    const deployCommit = process.env.DEPLOY_COMMIT || "unknown";
    const deployTime = process.env.DEPLOY_TIME || "unknown";

    return successResponse({
      commit: deployCommit,
      time: deployTime,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}
