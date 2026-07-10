// v2
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SetupChecklist } from "@/components/dashboard/setup-checklist"

const CalendarWithNew = dynamic(() => import("@/components/dashboard/calendar-with-new").then(m => m.CalendarWithNew), { ssr: false })

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
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
    },
  })

  if (!business) redirect("/onboarding")

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
      />
    </div>
  )
}
