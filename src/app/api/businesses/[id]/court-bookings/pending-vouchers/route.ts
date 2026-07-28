import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id: businessId } = await params

  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id: businessId, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const bookings = await prisma.courtBooking.findMany({
    where: {
      businessId,
      deletedAt: null,
      status: "CONFIRMED",
      transferVoucher: { not: null },
    },
    select: {
      id: true, startTime: true, price: true, paidAmount: true,
      client: { select: { name: true } },
      court: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
  })

  // Only those where payment hasn't been accepted yet
  const pending = bookings.filter(b => Number(b.paidAmount) < Number(b.price))

  return NextResponse.json({ pending, count: pending.length })
}
