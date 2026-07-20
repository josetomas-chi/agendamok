import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardShell } from "@/components/dashboard/shell"
import { BusinessProvider } from "@/contexts/business-context"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  // Try owner first
  let business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, logo: true, businessType: true, bsaleApiKey: true },
  })
  let memberRole: "ADMIN" | "RECEPTIONIST" = "ADMIN"

  // If not owner, check BusinessMember
  if (!business) {
    const member = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, acceptedAt: { not: null } },
      include: {
        business: { select: { id: true, name: true, logo: true, businessType: true, bsaleApiKey: true } },
      },
    })
    if (member) {
      business = member.business
      memberRole = member.role as "ADMIN" | "RECEPTIONIST"
    }
  }

  const hasBsale = !!business?.bsaleApiKey

  return (
    <BusinessProvider
      businessId={business?.id ?? ""}
      businessName={business?.name ?? ""}
      businessLogo={business?.logo ?? null}
      businessType={business?.businessType ?? "GENERAL"}
      hasBsale={hasBsale}
      memberRole={memberRole}
    >
      <DashboardShell
        businessId={business?.id ?? ""}
        businessName={business?.name ?? ""}
        businessLogo={business?.logo ?? null}
        businessType={business?.businessType ?? "GENERAL"}
        memberRole={memberRole}
      >
        {children}
      </DashboardShell>
    </BusinessProvider>
  )
}
