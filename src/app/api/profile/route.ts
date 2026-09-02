import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const userId = session.user.id
  const userEmail = session.user.email

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  })
  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  // Auto-link client records that match by email or RUT but aren't yet linked to this user.
  // This includes both orphans (userId=null) AND clients linked to a different account
  // with the same email (e.g. superadmin account vs demo account sharing the same email).
  const unlinkledByEmail = userEmail
    ? await prisma.client.findMany({
        where: { email: { equals: userEmail, mode: "insensitive" }, NOT: { userId }, deletedAt: null },
        select: { id: true },
      })
    : []

  const linkedRut = await prisma.client.findFirst({
    where: { userId, deletedAt: null, rut: { not: null } },
    select: { rut: true },
  })
  const knownRut = linkedRut?.rut ?? null
  const unlinkedByRut = knownRut
    ? await prisma.client.findMany({
        where: { rut: knownRut, NOT: { userId }, deletedAt: null },
        select: { id: true },
      })
    : []

  const allUnlinkedIds = [...new Set([...unlinkledByEmail, ...unlinkedByRut].map(o => o.id))]
  for (const id of allUnlinkedIds) {
    try {
      await prisma.client.update({ where: { id }, data: { userId } })
    } catch {
      // skip on error
    }
  }

  // All client records for this user (including just-linked ones)
  const clients = await prisma.client.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true, businessId: true, rut: true, phone: true,
      loyaltyPoints: true, creditBalance: true, segment: true,
      allowTransfer: true,
      business: {
        select: {
          name: true, slug: true, businessType: true,
          coverImage: true, primaryColor: true,
          loyaltyEnabled: true, loyaltyPointsPerVisit: true, loyaltyVipThreshold: true, segmentDiscounts: true,
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: {
          id: true, startDate: true, endDate: true, status: true,
          plan: { select: { name: true, description: true } },
          business: { select: { name: true } },
        },
        orderBy: { endDate: "asc" },
      },
    },
  })

  const clientIds = clients.map(c => c.id)
  const rut = clients.find(c => c.rut)?.rut ?? null
  const phone = clients.find(c => c.phone)?.phone ?? null
  const loyaltyPoints = clients.reduce((s, c) => s + c.loyaltyPoints, 0)
  const creditBalance = clients.reduce((s, c) => s + c.creditBalance, 0)
  const activeMemberships = clients.flatMap(c => c.memberships)

  // Per-business loyalty summary (only businesses with some data)
  const businessBenefits = clients.map(c => {
      const discounts = (c.business.segmentDiscounts ?? {}) as Record<string, number>
      const segmentDiscount = discounts[c.segment] ?? 0
      const vipThreshold = c.business.loyaltyVipThreshold ?? 500
      const pointsPerVisit = c.business.loyaltyPointsPerVisit ?? 10
      const ptsToNext = c.segment === "VIP" ? 0 : Math.max(0, vipThreshold - c.loyaltyPoints)
      return {
        businessId: c.businessId,
        businessName: c.business.name,
        businessSlug: c.business.slug,
        businessCover: c.business.coverImage ?? null,
        businessColor: c.business.primaryColor ?? "#38bdf8",
        loyaltyEnabled: c.business.loyaltyEnabled ?? true,
        loyaltyPoints: c.loyaltyPoints,
        creditBalance: c.creditBalance,
        segment: c.segment,
        segmentDiscount,
        pointsPerVisit,
        vipThreshold,
        ptsToNext,
        allowTransfer: c.allowTransfer,
      }
    })

  const now = new Date()

  // Upcoming appointments
  console.log("[/api/profile] querying upcomingAppointments")
  const upcomingAppointments = await prisma.appointment.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null, startTime: { gt: now }, status: { in: ["PENDING", "CONFIRMED"] } },
    select: {
      id: true, startTime: true, endTime: true, status: true,
      service: { select: { name: true, color: true, duration: true, price: true } },
      staff: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, slug: true, cancellationHoursNotice: true } },
    },
    orderBy: { startTime: "asc" },
    take: 5,
  })

  // Upcoming court bookings
  console.log("[/api/profile] querying upcomingCourtBookings for clientIds:", clientIds.length)
  const upcomingCourtBookings = await prisma.courtBooking.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null, startTime: { gt: now }, status: { not: "CANCELLED" } },
    select: {
      id: true, startTime: true, endTime: true, price: true, paidAmount: true, status: true, paidOnline: true,
      transferVoucher: true, recurringGroupId: true,
      recurringGroup: {
        select: { dayOfWeek: true, startHour: true, startMinute: true, durationMinutes: true, rangeStart: true, rangeEnd: true },
      },
      court: { select: { name: true, sport: true, color: true } },
      business: { select: { name: true, slug: true, cancellationHoursNotice: true } },
    },
    orderBy: { startTime: "asc" },
    take: 20,
  })
  // Past appointments (history)
  console.log("[/api/profile] querying past appointments")
  const appointments = await prisma.appointment.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null, startTime: { lte: now } },
    select: {
      id: true, startTime: true, endTime: true, status: true,
      service: { select: { name: true, color: true, duration: true, price: true } },
      staff: { select: { user: { select: { name: true } } } },
      business: { select: { name: true, slug: true } },
    },
    orderBy: { startTime: "desc" },
    take: 30,
  })

  // Past court bookings (history)
  console.log("[/api/profile] querying past courtBookings")
  const courtBookings = await prisma.courtBooking.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null, startTime: { lte: now } },
    select: {
      id: true, startTime: true, endTime: true, price: true, status: true, paidOnline: true,
      court: { select: { name: true, sport: true, color: true } },
      business: { select: { name: true, slug: true } },
    },
    orderBy: { startTime: "desc" },
    take: 30,
  })

  // Stats: most used service and staff
  const serviceCounts: Record<string, { name: string; color: string; count: number }> = {}
  const staffCounts: Record<string, { name: string; count: number }> = {}
  for (const a of appointments) {
    if (a.status === "COMPLETED") {
      const sn = a.service.name
      serviceCounts[sn] = serviceCounts[sn] ?? { name: sn, color: a.service.color, count: 0 }
      serviceCounts[sn].count++
      const stName = a.staff?.user.name
      if (stName) {
        staffCounts[stName] = staffCounts[stName] ?? { name: stName, count: 0 }
        staffCounts[stName].count++
      }
    }
  }
  const topService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0] ?? null
  const topStaff = Object.values(staffCounts).sort((a, b) => b.count - a.count)[0] ?? null
  const totalCompleted = appointments.filter(a => a.status === "COMPLETED").length

  // Tournament participations (by email or rut)
  const emailOrRutFilter = [
    userEmail ? { email: userEmail } : null,
    rut ? { rut } : null,
  ].filter(Boolean) as { email?: string; rut?: string }[]

  console.log("[/api/profile] querying tournamentParticipants")
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

  // Tournaments open for registration (not already joined)
  const joinedTournamentIds = tournamentParticipants.map(p => p.tournament.id)
  const now2 = new Date()
  console.log("[/api/profile] querying availableTournaments")
  const availableTournaments = await prisma.tournament.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      id: joinedTournamentIds.length > 0 ? { notIn: joinedTournamentIds } : undefined,
      OR: [
        { registrationDeadline: null },
        { registrationDeadline: { gt: now2 } },
      ],
    },
    select: {
      id: true, name: true, sport: true, format: true, participantType: true,
      startDate: true, endDate: true, maxParticipants: true, entryFee: true,
      status: true, description: true, slug: true, registrationDeadline: true,
      business: { select: { name: true, slug: true } },
      categories: { select: { id: true, name: true }, take: 10 },
      participants: { select: { id: true }, where: { status: { not: "WITHDRAWN" } } },
    },
    orderBy: { startDate: "asc" },
    take: 20,
  })

  const recentMatches = tournamentParticipants.flatMap(p => {
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

  console.log("[/api/profile] all queries complete, returning response")
  return NextResponse.json({
    user: { ...user, phone, rut },
    loyaltyPoints,
    creditBalance,
    businessBenefits,
    totalCompleted,
    topService,
    topStaff,
    activeMemberships,
    upcomingAppointments,
    upcomingCourtBookings,
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
    recentMatches,
    availableTournaments: availableTournaments.map(t => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      format: t.format,
      participantType: t.participantType,
      startDate: t.startDate,
      endDate: t.endDate,
      maxParticipants: t.maxParticipants,
      entryFee: t.entryFee ? Number(t.entryFee) : null,
      status: t.status,
      description: t.description,
      slug: t.slug,
      registrationDeadline: t.registrationDeadline,
      business: t.business,
      categories: t.categories,
      participantCount: t.participants.length,
    })),
  })
  } catch (err) {
    console.error("[/api/profile] unhandled error:", err)
    return NextResponse.json({ error: "Error interno", detail: String(err) }, { status: 500 })
  }
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
