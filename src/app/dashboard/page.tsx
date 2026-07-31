// v2
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { CalendarWithNew } from "@/components/dashboard/calendar-with-new"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SetupChecklist } from "@/components/dashboard/setup-checklist"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const businessSelect = {
    services: { where: { deletedAt: null, isActive: true }, select: { id: true, name: true, duration: true } },
    staff: {
      where: { deletedAt: null },
      include: {
        user: { select: { name: true, image: true } },
        schedules: { where: { isWorking: true }, select: { id: true }, take: 1 },
      },
    },
    clients: { where: { deletedAt: null }, select: { id: true, name: true } },
    locations: { where: { deletedAt: null, isActive: true }, select: { id: true, name: true } },
    _count: {
      select: {
        appointments: { where: { deletedAt: null, status: "CONFIRMED" } },
        clients: { where: { deletedAt: null } },
        staff: { where: { deletedAt: null } },
      },
    },
  } as const

  const cookieStore = await cookies()
  const activeBusinessId = cookieStore.get("active-business-id")?.value

  // 1. Try cookie — owned
  let business = activeBusinessId
    ? await prisma.business.findFirst({
        where: { id: activeBusinessId, ownerId: session.user.id, deletedAt: null },
        include: businessSelect,
      })
    : null

  // 2. Try cookie — member (recepcionista/admin)
  if (!business && activeBusinessId) {
    const member = await prisma.businessMember.findFirst({
      where: { businessId: activeBusinessId, userId: session.user.id, acceptedAt: { not: null } },
      select: { businessId: true },
    })
    if (member) {
      business = await prisma.business.findUnique({
        where: { id: member.businessId },
        include: businessSelect,
      })
    }
  }

  // 3. Fall back to first owned business
  if (!business) {
    business = await prisma.business.findFirst({
      where: { ownerId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: businessSelect,
    })
  }

  // 4. Fall back to first membership
  if (!business) {
    const member = await prisma.businessMember.findFirst({
      where: { userId: session.user.id, acceptedAt: { not: null } },
      select: { businessId: true },
    })
    if (member) {
      business = await prisma.business.findUnique({
        where: { id: member.businessId },
        include: businessSelect,
      })
    }
  }

  if (!business) redirect("/onboarding")
  if (business.businessType === "SPORTS_CLUB") redirect("/dashboard/club")

  // Pre-fetch appointments server-side so the calendar renders with data immediately
  const calFrom = new Date(); calFrom.setDate(1); calFrom.setHours(0, 0, 0, 0)
  const calTo = new Date(calFrom.getFullYear(), calFrom.getMonth() + 2, 0, 23, 59, 59)
  const initialAppointments = await prisma.appointment.findMany({
    where: { businessId: business.id, deletedAt: null, startTime: { gte: calFrom, lte: calTo }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    include: {
      service: { select: { name: true, color: true, price: true } },
      staff: { select: { id: true, color: true, user: { select: { name: true, image: true } } } },
      client: { select: { name: true, lastName: true, email: true, phone: true, segment: true } },
      payment: { select: { status: true, method: true, amount: true } },
    },
    orderBy: { startTime: "asc" },
  })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayCount = await prisma.appointment.count({
    where: { businessId: business.id, deletedAt: null, startTime: { gte: todayStart, lte: todayEnd } },
  })

  const hasServices = business.services.length > 0
  const hasStaff = business.staff.length > 0
  const hasSchedule = business.staff.some((s: typeof business.staff[number]) => s.schedules.length > 0)
  const isNewBusiness = !hasServices || !hasStaff || !hasSchedule

  return (
    <div className="space-y-6">
      <StatsCards
        totalAppointments={business._count.appointments}
        totalClients={business._count.clients}
        totalStaff={business._count.staff}
        todayCount={todayCount}
      />

      {isNewBusiness && (
        <SetupChecklist
          hasServices={hasServices}
          hasStaff={hasStaff}
          hasSchedule={hasSchedule}
          slug={business.slug}
          isSports={business.businessType === "SPORTS_CLUB"}
        />
      )}

      <CalendarWithNew
        businessId={business.id}
        services={business.services}
        staff={business.staff.map((s: typeof business.staff[number]) => ({ id: s.id, color: s.color, user: { name: s.user.name, image: s.user.image } }))}
        clients={business.clients}
        locations={business.locations}
        initialAppointments={initialAppointments}
      />
    </div>
  )
}
