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
      staff: { where: { deletedAt: null }, include: { user: { select: { name: true, image: true } } } },
      clients: { where: { deletedAt: null }, select: { id: true, name: true } },
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

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const todayCount = await prisma.appointment.count({
    where: { businessId: business.id, deletedAt: null, startTime: { gte: todayStart, lte: todayEnd } },
  })

  return (
    <div className="space-y-6">
      <StatsCards
        totalAppointments={business._count.appointments}
        totalClients={business._count.clients}
        totalStaff={business._count.staff}
        todayCount={todayCount}
      />

      <CalendarWithNew
        businessId={business.id}
        services={business.services}
        staff={business.staff.map((s: typeof business.staff[number]) => ({ id: s.id, color: s.color, user: { name: s.user.name, image: s.user.image } }))}
        clients={business.clients}
      />
    </div>
  )
}
