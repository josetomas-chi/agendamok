import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { DashboardShell } from "@/components/dashboard/shell"
import { BusinessProvider } from "@/contexts/business-context"
import { type PermissionMap } from "@/lib/permissions"

type BusinessOption = {
  id: string
  name: string
  logo: string | null
  businessType: string
  bsaleApiKey: string | null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  // Fetch all owned businesses
  const ownedBusinesses: BusinessOption[] = await prisma.business.findMany({
    where: { ownerId: session.user.id, deletedAt: null },
    select: { id: true, name: true, logo: true, businessType: true, bsaleApiKey: true },
    orderBy: { createdAt: "asc" },
  })

  // Fetch all businesses where user is a member
  const memberships = await prisma.businessMember.findMany({
    where: { userId: session.user.id, acceptedAt: { not: null } },
    include: {
      business: { select: { id: true, name: true, logo: true, businessType: true, bsaleApiKey: true } },
    },
  })

  const memberBusinesses: (BusinessOption & { role: string; permissions: PermissionMap })[] =
    memberships.map((m) => ({
      ...m.business,
      role: m.role,
      permissions: (m.permissions as PermissionMap) ?? {},
    }))

  const allBusinesses: BusinessOption[] = [
    ...ownedBusinesses,
    ...memberBusinesses.filter((mb) => !ownedBusinesses.find((ob) => ob.id === mb.id)),
  ]

  // Usuario sin negocios ni membresías → es solo cliente, ir a su perfil
  if (allBusinesses.length === 0) redirect("/profile")

  // Pick active business from cookie, fallback to first
  const cookieStore = await cookies()
  const activeCookieId = cookieStore.get("active-business-id")?.value
  const activeBusiness =
    allBusinesses.find((b) => b.id === activeCookieId) ?? allBusinesses[0]

  // Determine role for active business
  let memberRole: "ADMIN" | "RECEPTIONIST" = "ADMIN"
  let permissionOverrides: PermissionMap = {}
  const isOwned = ownedBusinesses.some((b) => b.id === activeBusiness.id)
  if (!isOwned) {
    const mb = memberBusinesses.find((mb) => mb.id === activeBusiness.id)
    if (mb) {
      memberRole = mb.role as "ADMIN" | "RECEPTIONIST"
      permissionOverrides = mb.permissions
    }
  }

  return (
    <BusinessProvider
      businessId={activeBusiness.id}
      businessName={activeBusiness.name}
      businessLogo={activeBusiness.logo ?? null}
      businessType={activeBusiness.businessType}
      hasBsale={!!activeBusiness.bsaleApiKey}
      memberRole={memberRole}
      permissionOverrides={permissionOverrides}
    >
      <DashboardShell
        businessId={activeBusiness.id}
        businessName={activeBusiness.name}
        businessLogo={activeBusiness.logo ?? null}
        businessType={activeBusiness.businessType}
        memberRole={memberRole}
        permissionOverrides={permissionOverrides}
        allBusinesses={allBusinesses.map((b) => ({ id: b.id, name: b.name, logo: b.logo ?? null, businessType: b.businessType }))}
        activeBusinessId={activeBusiness.id}
      >
        {children}
      </DashboardShell>
    </BusinessProvider>
  )
}
