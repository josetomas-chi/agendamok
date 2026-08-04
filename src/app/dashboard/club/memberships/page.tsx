import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import MembershipsClient from "./memberships-client"

export default async function MembershipsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const cookieStore = await cookies()
  const activeBusinessId = cookieStore.get("active-business-id")?.value

  let business = activeBusinessId
    ? await prisma.business.findFirst({
        where: { id: activeBusinessId, OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id, acceptedAt: { not: null } } } }] },
        select: { id: true },
      })
    : null

  if (!business) {
    business = await prisma.business.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
  }

  if (!business) redirect("/onboarding")

  const bid = business.id

  const [plans, memberships, clientsRaw] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { businessId: bid },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clientMembership.findMany({
      where: { businessId: bid },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        plan: { select: { id: true, name: true, price: true, durationDays: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.client.findMany({
      where: { businessId: bid, deletedAt: null },
      select: { id: true, name: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { name: "asc" }],
    }),
  ])

  return (
    <MembershipsClient
      businessId={bid}
      initialPlans={plans.map((p: typeof plans[0]) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        durationDays: p.durationDays,
        isActive: p.isActive,
        _count: { memberships: p._count.memberships },
      }))}
      initialMemberships={memberships.map((m: typeof memberships[0]) => ({
        id: m.id,
        clientId: m.clientId,
        planId: m.planId,
        startDate: m.startDate.toISOString(),
        endDate: m.endDate.toISOString(),
        status: m.status,
        client: { id: m.client.id, name: m.client.name, lastName: m.client.lastName, email: m.client.email },
        plan: { id: m.plan.id, name: m.plan.name, price: Number(m.plan.price), durationDays: m.plan.durationDays },
      }))}
      initialClients={clientsRaw.map((c: typeof clientsRaw[0]) => ({ id: c.id, name: c.name, lastName: c.lastName, email: c.email }))}
    />
  )
}
