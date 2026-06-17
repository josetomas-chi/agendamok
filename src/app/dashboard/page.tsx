import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarWithNew } from "@/components/dashboard/calendar-with-new"
import { StatsCards } from "@/components/dashboard/stats-cards"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { deletedAt: null, isActive: true }, select: { id: true, name: true, duration: true } },
      staff: { where: { deletedAt: null }, include: { user: { select: { name: true } } } },
      clients: { where: { deletedAt: null }, select: { id: true, name: true } },
      appointments: {
        where: {
          deletedAt: null,
          startTime: { gte: new Date(new Date().setDate(1)) },
        },
        include: { service: true, staff: { include: { user: true } }, client: true },
        orderBy: { startTime: "asc" },
      },
      _count: {
        select: {
          appointments: { where: { deletedAt: null, status: "CONFIRMED" } },
          clients: { where: { deletedAt: null } },
          staff: { where: { deletedAt: null } },
        },
      },
    },
  })

  if (!business) redirect("/onboarding")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayAppts = business.appointments.filter(
    (a: { startTime: Date }) => a.startTime >= today && a.startTime < tomorrow
  )

  return (
    <div className="space-y-6">
      <StatsCards
        totalAppointments={business._count.appointments}
        totalClients={business._count.clients}
        totalStaff={business._count.staff}
        todayCount={todayAppts.length}
      />

      <CalendarWithNew
        appointments={business.appointments}
        businessId={business.id}
        services={business.services}
        staff={business.staff.map((s: typeof business.staff[number]) => ({ id: s.id, user: { name: s.user.name } }))}
        clients={business.clients}
      />
    </div>
  )
}
