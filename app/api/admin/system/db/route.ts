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

    // Get database size
    const dbSizeResult = await prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    const dbSize = dbSizeResult[0]?.size || "Unknown";

    // Get active connections
    const connectionsResult = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `;
    const activeConnections = Number(connectionsResult[0]?.count || 0);

    // Get table sizes (top 10)
    const tableSizes = await prisma.$queryRaw<
      Array<{ table_name: string; size: string; row_count: bigint }>
    >`
      SELECT 
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `;

    return successResponse({
      dbSize,
      activeConnections,
      tableSizes: tableSizes.map((t) => ({
        ...t,
        row_count: Number(t.row_count),
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
}
