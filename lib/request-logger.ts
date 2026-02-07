import { prisma } from "@/lib/prisma";

interface LogRequestParams {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  ip?: string;
  error?: string;
}

/**
 * Asynchronously logs API request to the RequestLog table.
 * Fire-and-forget pattern - doesn't block the response.
 */
export async function logRequest(params: LogRequestParams): Promise<void> {
  try {
    // Fire and forget - don't await
    prisma.requestLog
      .create({
        data: {
          method: params.method,
          path: params.path,
          status: params.status,
          durationMs: params.durationMs,
          userId: params.userId,
          ip: params.ip,
          error: params.error,
        },
      })
      .catch((error) => {
        // Silent fail - don't crash the app if logging fails
        console.error("Failed to log request:", error);
      });
  } catch (error) {
    // Silent fail
    console.error("Failed to log request:", error);
  }
}

/**
 * Helper to extract IP from Next.js request headers
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    undefined
  );
}

/**
 * Wrapper function for API routes to automatically log requests.
 * Usage:
 * 
 * export const GET = withRequestLogging(async (request) => {
 *   // your handler logic
 * });
 */
export function withRequestLogging(
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const ip = getClientIp(request.headers);

    try {
      const response = await handler(request);
      const durationMs = Date.now() - startTime;

      // Log the request (fire and forget)
      logRequest({
        method,
        path,
        status: response.status,
        durationMs,
        ip,
        // userId can be added by extracting from auth token if needed
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log the error
      logRequest({
        method,
        path,
        status: 500,
        durationMs,
        ip,
        error: errorMessage,
      });

      throw error;
    }
  };
}
