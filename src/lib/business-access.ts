import { prisma } from "@/lib/prisma"

export async function hasBusinessAccess(businessId: string, userId: string) {
  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id: businessId, ownerId: userId }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId, userId, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  return !!(owner || member)
}
