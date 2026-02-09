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

    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") || "24");

    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get errors (status >= 500) grouped by path
    const errors = await prisma.requestLog.findMany({
      where: {
        status: {
          gte: 500,
        },
        createdAt: {
          gte: fromDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    // Group by path and count
    const errorsByPath: Record<
      string,
      { count: number; lastError: any; samples: any[] }
    > = {};

    errors.forEach((error) => {
      if (!errorsByPath[error.path]) {
        errorsByPath[error.path] = {
          count: 0,
          lastError: error,
          samples: [],
        };
      }
      errorsByPath[error.path].count++;
      if (errorsByPath[error.path].samples.length < 3) {
        errorsByPath[error.path].samples.push(error);
      }
    });

    const grouped = Object.entries(errorsByPath)
      .map(([path, data]) => ({
        path,
        ...data,
      }))
      .sort((a, b) => b.count - a.count);

    return successResponse({
      errors,
      grouped,
      totalErrors: errors.length,
      timeRange: `Last ${hours} hours`,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}
