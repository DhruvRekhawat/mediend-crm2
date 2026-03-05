import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { getEmployeeByUserId, getSubordinates } from "@/lib/hierarchy"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const list: { id: string; name: string; email: string }[] = [
    { id: user.id, name: user.name ?? "Me", email: user.email ?? "" },
  ]

  const employee = await getEmployeeByUserId(user.id)
  if (employee) {
    const directReports = await getSubordinates(employee.id, false)
    for (const sub of directReports) {
      list.push({
        id: sub.userId,
        name: sub.user.name,
        email: sub.user.email ?? "",
      })
    }
  }

  return successResponse(list)
}
