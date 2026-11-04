import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import CoachPortalClient from "./coach-portal-client"

export default async function CoachPortalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const coach = await prisma.clubCoach.findUnique({
    where: { userId: session.user.id },
    include: {
      business: { select: { id: true, name: true, logo: true } },
      feeRules: true,
    },
  })

  if (!coach) redirect("/dashboard")

  return <CoachPortalClient coach={coach} />
}
