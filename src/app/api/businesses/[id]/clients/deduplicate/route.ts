import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasBusinessAccess } from "@/lib/business-access"

// POST /api/businesses/[id]/clients/deduplicate
// Query params:
//   ?dryRun=true  → preview only, no changes
//   ?dryRun=false → execute merge
//
// Finds duplicate client records within the business (same rut OR same email),
// picks a winner per group (prefers userId-linked, then oldest),
// re-assigns all related records to the winner, soft-deletes the rest.

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId } = await params
  const isSuperAdmin = (session.user as { role?: string }).role === "SUPER_ADMIN"
  const hasAccess = isSuperAdmin || await hasBusinessAccess(session.user.id, businessId)
  if (!hasAccess) return NextResponse.json({ error: "Sin acceso" }, { status: 403 })

  const url = new URL(req.url)
  const dryRun = url.searchParams.get("dryRun") !== "false"

  // Load all non-deleted clients with their key fields
  const all = await prisma.client.findMany({
    where: { businessId, deletedAt: null },
    select: {
      id: true, name: true, email: true, rut: true, userId: true, createdAt: true,
      _count: {
        select: {
          appointments: true,
          courtBookings: true,
          memberships: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Group duplicates: by normalized email, then by rut
  const groups = new Map<string, typeof all>()

  for (const c of all) {
    const emailKey = c.email ? `email:${c.email.toLowerCase().trim()}` : null
    const rutKey   = c.rut   ? `rut:${c.rut.replace(/\s/g, "")}`       : null

    // Find if this client already belongs to a group
    let groupKey: string | null = null
    for (const [k, members] of groups) {
      const match = members.some(m =>
        (emailKey && m.email?.toLowerCase().trim() === c.email?.toLowerCase().trim()) ||
        (rutKey   && m.rut?.replace(/\s/g, "")     === c.rut?.replace(/\s/g, "")),
      )
      if (match) { groupKey = k; break }
    }

    if (!groupKey) {
      groupKey = emailKey ?? rutKey ?? `solo:${c.id}`
    }
    const existing = groups.get(groupKey) ?? []
    groups.set(groupKey, [...existing, c])
  }

  // Only keep groups with actual duplicates
  const duplicateGroups = [...groups.values()].filter(g => g.length > 1)

  if (duplicateGroups.length === 0) {
    return NextResponse.json({ message: "No hay duplicados", merged: 0, dryRun })
  }

  type MergePreview = {
    winner: { id: string; name: string; email: string | null; rut: string | null }
    merged: { id: string; name: string; email: string | null; rut: string | null }[]
    recordsMoved: { appointments: number; courtBookings: number; memberships: number }
  }
  const previews: MergePreview[] = []
  let totalMerged = 0

  for (const group of duplicateGroups) {
    // Pick winner: prefer userId-linked, then most records, then oldest
    const winner = group.slice().sort((a, b) => {
      if (a.userId && !b.userId) return -1
      if (!a.userId && b.userId) return 1
      const aTotal = a._count.appointments + a._count.courtBookings + a._count.memberships
      const bTotal = b._count.appointments + b._count.courtBookings + b._count.memberships
      if (bTotal !== aTotal) return bTotal - aTotal
      return a.createdAt < b.createdAt ? -1 : 1
    })[0]

    const losers = group.filter(c => c.id !== winner.id)
    const recordsMoved = {
      appointments:  losers.reduce((s, c) => s + c._count.appointments,  0),
      courtBookings: losers.reduce((s, c) => s + c._count.courtBookings, 0),
      memberships:   losers.reduce((s, c) => s + c._count.memberships,   0),
    }

    previews.push({
      winner:  { id: winner.id, name: winner.name, email: winner.email, rut: winner.rut },
      merged:  losers.map(l => ({ id: l.id, name: l.name, email: l.email, rut: l.rut })),
      recordsMoved,
    })

    if (!dryRun) {
      const loserIds = losers.map(l => l.id)
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        // Re-assign all related records from losers to winner
        await tx.appointment.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.courtBooking.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.clientMembership.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.recurringBookingGroup.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.walletTransaction.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.schoolEnrollment.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })
        await tx.schoolAttendance.updateMany({
          where: { clientId: { in: loserIds } },
          data:  { clientId: winner.id },
        })

        // Merge email/rut into winner if it's missing them
        const winnerUpdates: Record<string, string | null> = {}
        if (!winner.email) {
          const emailSource = losers.find(l => l.email)
          if (emailSource) winnerUpdates.email = emailSource.email
        }
        if (!winner.rut) {
          const rutSource = losers.find(l => l.rut)
          if (rutSource) winnerUpdates.rut = rutSource.rut
        }
        if (Object.keys(winnerUpdates).length > 0) {
          await tx.client.update({ where: { id: winner.id }, data: winnerUpdates })
        }

        // Soft-delete losers
        await tx.client.updateMany({
          where: { id: { in: loserIds } },
          data:  { deletedAt: now },
        })
      })

      totalMerged += losers.length
    }
  }

  return NextResponse.json({
    dryRun,
    duplicateGroups: duplicateGroups.length,
    merged: dryRun ? 0 : totalMerged,
    previews,
  })
}
