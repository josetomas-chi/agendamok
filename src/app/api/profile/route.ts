import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const userId = session.user.id
  const userEmail = session.user.email

  // Basic user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  // All client records linked to this user (across businesses)
  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, businessId: true, rut: true, phone: true, business: { select: { name: true, slug: true, businessType: true } } },
  })

  const clientIds = clients.map(c => c.id)
  const rut = clients.find(c => c.rut)?.rut ?? null
  const phone = clients.find(c => c.phone)?.phone ?? null

  // Court bookings (last 20, most recent first)
  const courtBookings = await prisma.courtBooking.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null },
    select: {
      id: true, startTime: true, endTime: true, price: true, status: true, paidOnline: true,
      court: { select: { name: true, sport: true, color: true } },
      business: { select: { name: true, slug: true } },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  })

  // Service appointments (last 20)
  const appointments = await prisma.appointment.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null },
    select: {
      id: true, startTime: true, endTime: true, status: true,
      service: { select: { name: true, color: true, duration: true, price: true } },
      staff: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, slug: true } },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  })

  // Tournament participations (match by email or rut)
  const emailOrRutFilter = [
    userEmail ? { email: userEmail } : null,
    rut ? { rut } : null,
  ].filter(Boolean) as { email?: string; rut?: string }[]

  const tournamentParticipants = emailOrRutFilter.length > 0
    ? await prisma.tournamentParticipant.findMany({
        where: { OR: emailOrRutFilter },
        select: {
          id: true, name: true, status: true, seed: true, ladderPosition: true, group: true,
          tournament: {
            select: {
              id: true, name: true, status: true, startDate: true, endDate: true, sport: true,
              business: { select: { name: true } },
            },
          },
          category: { select: { name: true } },
          matchesAs1: {
            select: { id: true, round: true, score1: true, score2: true, status: true, winnerId: true, participant2: { select: { name: true } } },
          },
          matchesAs2: {
            select: { id: true, round: true, score1: true, score2: true, status: true, winnerId: true, participant1: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : []

  // Build match results from both sides
  const matches = tournamentParticipants.flatMap(p => {
    const asP1 = p.matchesAs1.map(m => ({
      id: m.id, round: m.round, status: m.status,
      myScore: m.score1, opponentScore: m.score2,
      opponent: m.participant2?.name ?? "BYE",
      result: m.status === "COMPLETED" ? (m.winnerId === p.id ? "W" : "L") : "P",
      tournamentName: p.tournament.name,
      participantId: p.id,
    }))
    const asP2 = p.matchesAs2.map(m => ({
      id: m.id, round: m.round, status: m.status,
      myScore: m.score2, opponentScore: m.score1,
      opponent: m.participant1?.name ?? "BYE",
      result: m.status === "COMPLETED" ? (m.winnerId === p.id ? "W" : "L") : "P",
      tournamentName: p.tournament.name,
      participantId: p.id,
    }))
    return [...asP1, ...asP2]
  }).sort((a, b) => b.round - a.round).slice(0, 10)

  return NextResponse.json({
    user: { ...user, phone, rut },
    clients,
    courtBookings,
    appointments,
    tournaments: tournamentParticipants.map(p => ({
      participantId: p.id,
      participantName: p.name,
      status: p.status,
      seed: p.seed,
      ladderPosition: p.ladderPosition,
      group: p.group,
      category: p.category?.name ?? null,
      tournament: p.tournament,
    })),
    recentMatches: matches,
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { name, image } = body

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name && { name: name.trim() }),
      ...(image !== undefined && { image }),
    },
    select: { id: true, name: true, email: true, image: true },
  })

  return NextResponse.json({ user: updated })
}
