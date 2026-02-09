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

    const minutes = 15;
    const fromDate = new Date(Date.now() - minutes * 60 * 1000);

    // Get recent requests with user IDs
    const recentRequests = await prisma.requestLog.findMany({
      where: {
        userId: {
          not: null,
        },
        createdAt: {
          gte: fromDate,
        },
      },
      select: {
        userId: true,
        path: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by user and get their latest activity
    const userActivity: Record<
      string,
      { userId: string; lastPath: string; lastActive: Date; requestCount: number }
    > = {};

    recentRequests.forEach((req) => {
      if (!req.userId) return;

      if (!userActivity[req.userId]) {
        userActivity[req.userId] = {
          userId: req.userId,
          lastPath: req.path,
          lastActive: req.createdAt,
          requestCount: 0,
        };
      }
      userActivity[req.userId].requestCount++;
    });

    // Get user details
    const userIds = Object.keys(userActivity);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Combine user details with activity
    const activeUsers = users.map((user) => ({
      ...user,
      ...userActivity[user.id],
    }));

    return successResponse({
      activeUsers,
      totalActive: activeUsers.length,
      timeRange: `Last ${minutes} minutes`,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}
