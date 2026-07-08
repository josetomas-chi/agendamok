import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ClubPageClient from "./club-client"

export default async function ClubPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  })

  if (!business) redirect("/onboarding")

  return <ClubPageClient businessId={business.id} />
}
