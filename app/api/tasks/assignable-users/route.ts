import { NextRequest } from "next/server"
import { getSessionFromRequest } from "@/lib/session"
import { successResponse, unauthorizedResponse } from "@/lib/api-utils"
import { getEmployeeByUserId, getSubordinates, isUserInMDManagedCohort } from "@/lib/hierarchy"
import { prisma } from "@/lib/prisma"

export async function GET(_request: NextRequest) {
  const user = getSessionFromRequest(_request)
  if (!user) return unauthorizedResponse()

  const isMDOrAdmin = user.role === "MD" || user.role === "ADMIN"
  const inCohort = !isMDOrAdmin && (await isUserInMDManagedCohort(user.id))

  if (isMDOrAdmin || inCohort) {
    const allEligible = await prisma.user.findMany({
      where: { role: { notIn: ["MD", "ADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    })
    return successResponse(allEligible)
  }

  const list: { id: string; name: string; email: string }[] = [
    { id: user.id, name: user.name ?? "Me", email: user.email ?? "" },
  ]
  const employee = await getEmployeeByUserId(user.id)
  if (employee) {
    const directReports = await getSubordinates(employee.id, false)
    for (const sub of directReports) {
      if (sub.user?.role !== "MD" && sub.user?.role !== "ADMIN") {
        list.push({
          id: sub.userId,
          name: sub.user.name,
          email: sub.user.email ?? "",
        })
      }
    }
  }
  return successResponse(list)
}
