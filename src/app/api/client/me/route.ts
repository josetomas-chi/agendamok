import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { utcToChileLocal } from "@/lib/timezone"
import { format } from "date-fns"
import { es } from "date-fns/locale"

async function getClientEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("client-session")?.value
  if (!token) return null

  const session = await prisma.clientSession.findUnique({
    where: { token },
  })
  if (!session || session.expiresAt < new Date()) return null
  return session.email
}

export async function GET() {
  const email = await getClientEmail()
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const clients = await prisma.client.findMany({
    where: { email, deletedAt: null },
    select: { id: true, name: true },
  })

  if (clients.length === 0) return NextResponse.json({ email, appointments: [], name: null })

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: { in: clients.map(c => c.id) },
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    orderBy: { startTime: "desc" },
    take: 50,
    include: {
      service: { select: { name: true, duration: true, color: true } },
      staff: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, slug: true, address: true, city: true, logo: true } },
    },
  })

  type Appt = (typeof appointments)[number]
  const mapped = appointments.map((a: Appt) => {
    const local = utcToChileLocal(a.startTime)
    return {
      id: a.id,
      status: a.status,
      cancelToken: a.cancelToken,
      date: format(local, "EEEE d 'de' MMMM yyyy", { locale: es }),
      time: format(local, "HH:mm"),
      isPast: a.startTime < new Date(),
      service: { name: a.service.name, duration: a.service.duration, color: a.service.color },
      staff: a.staff?.user.name ?? null,
      business: {
        name: a.business.name,
        slug: a.business.slug,
        address: [a.business.address, a.business.city].filter(Boolean).join(", ") || null,
        logo: a.business.logo,
      },
    }
  })

  const firstName = clients[0].name.split(" ")[0]

  return NextResponse.json({ email, name: firstName, appointments: mapped })
}
