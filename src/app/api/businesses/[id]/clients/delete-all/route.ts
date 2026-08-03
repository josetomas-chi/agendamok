import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Borrar todos los clientes SIN reservas ni citas asociadas
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId: id, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  // Solo borrar clientes que no tienen reservas ni citas (importados sin actividad)
  const result = await prisma.client.deleteMany({
    where: {
      businessId: id,
      appointments: { none: {} },
      courtBookings: { none: {} },
    },
  })

  return NextResponse.json({ deleted: result.count })
}
