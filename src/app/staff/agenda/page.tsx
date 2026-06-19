import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { utcToChileLocal } from "@/lib/timezone"
import { format, startOfDay, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { StaffAgendaClient } from "./staff-agenda-client"

export default async function StaffAgendaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const staffMember = await prisma.staffMember.findUnique({
    where: { userId: session.user.id },
    include: { business: { select: { name: true, logo: true } } },
  })

  if (!staffMember) redirect("/dashboard")

  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())

  const appointments = await prisma.appointment.findMany({
    where: {
      staffId: staffMember.id,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gte: todayStart, lte: todayEnd },
    },
    orderBy: { startTime: "asc" },
    include: {
      client: { select: { name: true, phone: true, email: true } },
      service: { select: { name: true, duration: true, color: true } },
    },
  })

  const mapped = appointments.map(a => ({
    id: a.id,
    status: a.status,
    time: format(utcToChileLocal(a.startTime), "HH:mm"),
    endTime: format(utcToChileLocal(a.endTime), "HH:mm"),
    client: { name: a.client.name, phone: a.client.phone, email: a.client.email },
    service: { name: a.service.name, duration: a.service.duration, color: a.service.color },
  }))

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <StaffAgendaClient
      appointments={mapped}
      today={today}
      staffName={session.user.name ?? ""}
      businessName={staffMember.business.name}
      businessLogo={staffMember.business.logo}
    />
  )
}
