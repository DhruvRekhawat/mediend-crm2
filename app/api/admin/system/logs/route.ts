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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const path = url.searchParams.get("path") || undefined;
    const status = url.searchParams.get("status")
      ? parseInt(url.searchParams.get("status")!)
      : undefined;
    const fromDate = url.searchParams.get("fromDate")
      ? new Date(url.searchParams.get("fromDate")!)
      : undefined;
    const toDate = url.searchParams.get("toDate")
      ? new Date(url.searchParams.get("toDate")!)
      : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (path) {
      where.path = { contains: path };
    }
    if (status) {
      where.status = status;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.requestLog.count({ where }),
    ]);

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}
