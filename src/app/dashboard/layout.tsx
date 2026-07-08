import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardShell } from "@/components/dashboard/shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { businessType: true },
  })

  return <DashboardShell businessType={business?.businessType ?? "GENERAL"}>{children}</DashboardShell>
}
