import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { UserRole } from "@prisma/client";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const user = getSessionFromRequest(request);
    if (!user || (user.role !== UserRole.MD && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CPU usage
    const cpus = os.cpus();
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length;

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;

    // Disk usage (Linux only - works on VPS)
    let diskUsage = null;
    try {
      if (process.platform === "linux") {
        const { stdout } = await execAsync("df -h / | tail -n 1");
        const parts = stdout.trim().split(/\s+/);
        diskUsage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usagePercent: parseFloat(parts[4]),
        };
      }
    } catch (error) {
      // Disk usage not available
    }

    return NextResponse.json({
      cpu: {
        count: cpus.length,
        usagePercent: Math.round(cpuUsage * 10) / 10,
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round(memUsagePercent * 10) / 10,
        totalFormatted: formatBytes(totalMem),
        usedFormatted: formatBytes(usedMem),
        freeFormatted: formatBytes(freeMem),
      },
      disk: diskUsage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
