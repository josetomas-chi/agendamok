import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardShell } from "@/components/dashboard/shell"
import { BusinessProvider } from "@/contexts/business-context"
import { type PermissionMap } from "@/lib/permissions"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  let business: { id: string; name: string; logo: string | null; businessType: string; bsaleApiKey: string | null } | null = null
  let memberRole: "ADMIN" | "RECEPTIONIST" = "ADMIN"
  let permissionOverrides: PermissionMap = {}

  // Try owner first
  business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, logo: true, businessType: true, bsaleApiKey: true },
  })

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
      permissionOverrides = (member.permissions as PermissionMap) ?? {}
    }
  }

  return (
    <BusinessProvider
      businessId={business?.id ?? ""}
      businessName={business?.name ?? ""}
      businessLogo={business?.logo ?? null}
      businessType={business?.businessType ?? "GENERAL"}
      hasBsale={!!business?.bsaleApiKey}
      memberRole={memberRole}
      permissionOverrides={permissionOverrides}
    >
      <DashboardShell
        businessId={business?.id ?? ""}
        businessName={business?.name ?? ""}
        businessLogo={business?.logo ?? null}
        businessType={business?.businessType ?? "GENERAL"}
        memberRole={memberRole}
        permissionOverrides={permissionOverrides}
      >
        {children}
      </DashboardShell>
    </BusinessProvider>
  )
}
