import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { utcToChileLocal } from "@/lib/timezone"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase().trim()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }

  const clients = await prisma.client.findMany({
    where: { email, deletedAt: null },
    select: { id: true },
  })

  if (clients.length === 0) {
    return NextResponse.json({ appointments: [] })
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: { in: clients.map((c: { id: string }) => c.id) },
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

  const mapped = appointments.map(a => {
    const local = utcToChileLocal(a.startTime)
    return {
      id: a.id,
      status: a.status,
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

  return NextResponse.json({ appointments: mapped })
}
