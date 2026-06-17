import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function getBusinessOrRedirect() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, slug: true, currency: true },
  })

  if (!business) redirect("/onboarding")
  return { business, session }
}
