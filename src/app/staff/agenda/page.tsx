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

  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())

  // Staff member (professional en negocio regular)
  const staffMember = await prisma.staffMember.findUnique({
    where: { userId: session.user.id },
    include: { business: { select: { name: true, logo: true, category: true } } },
  })

  // Coach (entrenador en club deportivo) — identificado por email
  const coach = session.user.email
    ? await prisma.clubCoach.findFirst({
        where: { email: session.user.email, isActive: true },
        include: { business: { select: { name: true, logo: true, category: true } } },
      })
    : null

  if (!staffMember && !coach) redirect("/dashboard")

  const business = (staffMember?.business ?? coach?.business)!

  // Turnos del profesional
  const appointments = staffMember
    ? await prisma.appointment.findMany({
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
    : []

  // Reservas de cancha del entrenador (solo en clubs deportivos)
  const courtBookings = coach
    ? await prisma.courtBooking.findMany({
        where: {
          coachId: coach.id,
          deletedAt: null,
          status: { in: ["CONFIRMED", "PENDING"] },
          startTime: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { startTime: "asc" },
        include: {
          court: { select: { name: true, color: true, sport: true } },
          client: { select: { name: true, phone: true } },
        },
      })
    : []

  const mappedAppts = appointments.map(a => ({
    id: a.id,
    status: a.status,
    time: format(utcToChileLocal(a.startTime), "HH:mm"),
    endTime: format(utcToChileLocal(a.endTime), "HH:mm"),
    client: { name: a.client.name, phone: a.client.phone, email: a.client.email },
    service: { name: a.service.name, duration: a.service.duration, color: a.service.color },
  }))

  const mappedCourts = courtBookings.map(b => ({
    id: b.id,
    time: format(utcToChileLocal(b.startTime), "HH:mm"),
    endTime: format(utcToChileLocal(b.endTime), "HH:mm"),
    court: { name: b.court.name, color: b.court.color, sport: b.court.sport },
    client: b.client ? { name: b.client.name, phone: b.client.phone } : null,
  }))

  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  const isSports = business.category === "SPORTS_CLUB"

  return (
    <StaffAgendaClient
      appointments={mappedAppts}
      courtBookings={mappedCourts}
      today={today}
      staffName={session.user.name ?? ""}
      businessName={business.name}
      businessLogo={business.logo}
      isSports={isSports}
    />
  )
}
