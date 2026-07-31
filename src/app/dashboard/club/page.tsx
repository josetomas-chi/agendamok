import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import ClubPageClient from "./club-client"

export default async function ClubPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const cookieStore = await cookies()
  const activeBusinessId = cookieStore.get("active-business-id")?.value

  let business = activeBusinessId
    ? await prisma.business.findFirst({
        where: { id: activeBusinessId, ownerId: session.user.id },
        select: { id: true, businessType: true },
      })
    : null

  if (!business) {
    business = await prisma.business.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, businessType: true },
    })
  }

  if (!business) {
    const member = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, acceptedAt: { not: null } },
      select: { businessId: true },
    })
    if (member) {
      const b = await prisma.business.findUnique({
        where: { id: member.businessId },
        select: { id: true, businessType: true },
      })
      if (b) business = b
    }
  }

  if (!business) redirect("/onboarding")
  if (business.businessType !== "SPORTS_CLUB") redirect("/dashboard")

  return <ClubPageClient businessId={business.id} />
}
