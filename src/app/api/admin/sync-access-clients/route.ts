import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const approved = await prisma.businessAccessRequest.findMany({
    where: { status: "APPROVED", email: { not: null } },
    select: { id: true, businessId: true, name: true, email: true, phone: true, rut: true },
  })

  let created = 0
  let linked = 0
  let skipped = 0

  for (const req of approved) {
    if (!req.email) continue

    const user = await prisma.user.findUnique({
      where: { email: req.email },
      select: { id: true },
    })
    if (!user) { skipped++; continue }

    const existingClient = await prisma.client.findFirst({
      where: { businessId: req.businessId, userId: user.id, deletedAt: null },
    })
    if (existingClient) { skipped++; continue }

    const clientByEmail = await prisma.client.findFirst({
      where: { businessId: req.businessId, email: req.email, deletedAt: null },
    })
    if (clientByEmail) {
      await prisma.client.update({ where: { id: clientByEmail.id }, data: { userId: user.id } })
      linked++
    } else {
      await prisma.client.create({
        data: {
          businessId: req.businessId,
          userId: user.id,
          name: req.name,
          email: req.email,
          phone: req.phone ?? undefined,
          rut: req.rut ?? undefined,
        },
      })
      created++
    }
  }

  return NextResponse.json({ ok: true, created, linked, skipped, total: approved.length })
}
