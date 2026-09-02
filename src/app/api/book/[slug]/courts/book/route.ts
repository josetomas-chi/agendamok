import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { addMinutes, parseISO } from "date-fns"
import { sendCourtBookingConfirmation } from "@/lib/email"
import { getCourtBookingPrice } from "@/lib/pricing"
import { chileLocalToUTC } from "@/lib/timezone"


export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
  const { slug } = await params
  const body = await req.json()
  const { courtId, date, time, duration = 60, clientName, clientEmail, clientPhone, clientRut, notes } = body

  if (!courtId || !date || !time || !clientName || !clientEmail) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
  }

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: { id: true, name: true, clubSettings: { select: { bookingWindowDays: true } } },
  })
  if (!business) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const startTime = chileLocalToUTC(parseISO(`${date}T${time}`))
  const endTime = addMinutes(startTime, duration)

  if (startTime <= new Date()) {
    return NextResponse.json({ error: "No se puede reservar en el pasado" }, { status: 400 })
  }
  const windowDays = business.clubSettings?.bookingWindowDays ?? 30
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + windowDays)
  if (startTime > maxDate) {
    return NextResponse.json({ error: `Solo se puede reservar con hasta ${windowDays} días de anticipación` }, { status: 400 })
  }

  // Load court and validate it belongs to this business
  const court = await prisma.court.findFirst({
    where: { id: courtId, businessId: business.id, isActive: true },
    select: {
      name: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true,
      pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true } },
    },
  })
  if (!court) return NextResponse.json({ error: "Cancha no disponible" }, { status: 404 })

  // Server-side price calculation
  const { price, error: durationError } = getCourtBookingPrice(court.pricingRules, date, time, Number(duration))
  if (durationError) return NextResponse.json({ error: durationError }, { status: 400 })

  // Find or create client (outside transaction — not part of the critical section)
  const session = await auth()
  const loggedUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    : null

  // Resolve userId: from active session or by matching email to an existing User account
  const userByEmail = !loggedUser
    ? await prisma.user.findUnique({ where: { email: clientEmail }, select: { id: true } })
    : null
  const resolvedUserId = loggedUser?.id ?? userByEmail?.id ?? null

  // Normalize RUT for DB lookup: strip dots/spaces, keep digits+k
  const normalizedRut = clientRut ? clientRut.replace(/[.\s]/g, "").toLowerCase() : null

  // Find existing client by email OR by rut (trying normalized forms)
  let client = await prisma.client.findFirst({
    where: {
      businessId: business.id,
      deletedAt: null,
      OR: [
        { email: { equals: clientEmail, mode: "insensitive" } },
        ...(clientRut ? [{ rut: clientRut }] : []),
        ...(normalizedRut && normalizedRut !== clientRut ? [{ rut: normalizedRut }] : []),
      ],
    },
  })
  if (!client) {
    // Try creating; if unique constraint fires (duplicate rut), find and use existing
    try {
      client = await prisma.client.create({
        data: { businessId: business.id, name: clientName, email: clientEmail, phone: clientPhone || null, rut: clientRut || null, ...(resolvedUserId ? { userId: resolvedUserId } : {}) },
      })
    } catch (createErr: unknown) {
      const isUniqueViolation = (createErr as { code?: string })?.code === "P2002"
      if (!isUniqueViolation) throw createErr
      // Another client with this rut exists (different format) — find and use it
      client = await prisma.client.findFirst({
        where: { businessId: business.id, deletedAt: null, OR: [{ email: { equals: clientEmail, mode: "insensitive" } }, ...(clientRut ? [{ rut: { contains: clientRut.replace(/[.\s-]/g, "") } }] : [])] },
      }) ?? await prisma.client.findFirst({ where: { businessId: business.id, deletedAt: null, email: { equals: clientEmail, mode: "insensitive" } } })
      if (!client) throw createErr
    }
  } else {
    const updates: Record<string, unknown> = {}
    if (resolvedUserId && client.userId !== resolvedUserId) updates.userId = resolvedUserId
    if (clientRut && !client.rut) {
      // Only assign RUT if no other client in this business already has it
      const rutTaken = await prisma.client.findFirst({
        where: { businessId: business.id, deletedAt: null, NOT: { id: client.id }, OR: [{ rut: clientRut }, ...(normalizedRut ? [{ rut: normalizedRut }] : [])] },
        select: { id: true },
      })
      if (!rutTaken) updates.rut = clientRut
    }
    if (Object.keys(updates).length > 0) {
      try {
        client = await prisma.client.update({ where: { id: client.id }, data: updates })
      } catch (updateErr: unknown) {
        // Unique constraint on rut — skip the rut update, keep the rest
        const isUniqueViolation = (updateErr as { code?: string })?.code === "P2002"
        if (!isUniqueViolation) throw updateErr
        const safeUpdates = { ...updates }
        delete safeUpdates.rut
        if (Object.keys(safeUpdates).length > 0)
          client = await prisma.client.update({ where: { id: client.id }, data: safeUpdates })
      }
    }
  }

  // Atomic: check availability + create booking in a serializable transaction
  // This prevents double-bookings if two requests arrive simultaneously.
  let booking: { id: string; startTime: Date; endTime: Date; price: number; status: string; clientId: string } | null = null
  let existingOwnBooking: typeof booking | null = null
  try {
    booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.courtBooking.findFirst({
        where: {
          courtId,
          deletedAt: null,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: "CANCELLED" },
        },
        select: { id: true, startTime: true, endTime: true, price: true, status: true, clientId: true },
      })
      // If the conflict belongs to the same person (by clientId OR by same email in this business),
      // treat it as a duplicate submission and return it as success.
      if (conflict) {
        if (conflict.clientId === client.id) {
          existingOwnBooking = conflict
          return conflict
        }
        // Check if the conflicting booking belongs to another record of the same person
        const conflictClient = await tx.client.findUnique({
          where: { id: conflict.clientId },
          select: { email: true, rut: true },
        })
        const sameEmail = conflictClient?.email && clientEmail &&
          conflictClient.email.toLowerCase() === clientEmail.toLowerCase()
        const sameRut = conflictClient?.rut && clientRut &&
          conflictClient.rut.replace(/[.\s]/g, "") === clientRut.replace(/[.\s]/g, "")
        if (sameEmail || sameRut) {
          existingOwnBooking = conflict
          return conflict
        }
        return null
      }

      return tx.courtBooking.create({
        data: {
          businessId: business.id,
          courtId,
          clientId: client.id,
          startTime,
          endTime,
          price,
          notes: notes || null,
          status: "CONFIRMED",
        },
        select: { id: true, startTime: true, endTime: true, price: true, status: true, clientId: true },
      })
    }, { isolationLevel: "Serializable" })
  } catch {
    // Serialization failure — treat as slot taken
    return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })
  }

  if (!booking) return NextResponse.json({ error: "Horario no disponible" }, { status: 409 })

  // Send confirmation email for new bookings AND for own-duplicate (email may not have arrived before)
  if (true) {
    sendCourtBookingConfirmation({
      clientName,
      clientEmail,
      businessName: business.name,
      courtName: court.name,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      price,
      sponsorName: court.sponsorName ?? undefined,
      sponsorLogo: court.sponsorLogo ?? undefined,
      sponsorUrl: court.sponsorUrl ?? undefined,
    }).catch(() => {})
  }

  return NextResponse.json({ booking, allowTransfer: client.allowTransfer })
  } catch (err) {
    console.error("[/api/book/courts/book] unhandled error:", err)
    return NextResponse.json({ error: "Error interno al confirmar reserva", detail: String(err) }, { status: 500 })
  }
}
