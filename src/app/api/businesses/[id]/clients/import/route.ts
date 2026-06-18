import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Row = { name: string; email?: string; phone?: string; notes?: string }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const business = await prisma.business.findUnique({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  let rows: Row[]
  try {
    const body = await req.json()
    rows = body.rows
    if (!Array.isArray(rows)) throw new Error()
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
  }

  // Validate rows
  const valid = rows.filter(r => r.name && typeof r.name === "string" && r.name.trim())
  if (valid.length === 0) return NextResponse.json({ error: "No hay filas válidas" }, { status: 400 })

  // Get existing emails to skip duplicates
  const emails = valid.map(r => r.email?.trim().toLowerCase()).filter(Boolean) as string[]
  const existing = await prisma.client.findMany({
    where: { businessId: id, email: { in: emails } },
    select: { email: true },
  })
  const existingEmails = new Set(existing.map((c: { email: string | null }) => c.email?.toLowerCase()))

  let created = 0
  let skipped = 0

  for (const row of valid) {
    const email = row.email?.trim().toLowerCase() || undefined
    if (email && existingEmails.has(email)) { skipped++; continue }

    await prisma.client.create({
      data: {
        businessId: id,
        name: row.name.trim(),
        email: email || null,
        phone: row.phone?.trim() || null,
        notes: row.notes?.trim() || null,
      },
    })
    created++
  }

  return NextResponse.json({ created, skipped, total: valid.length })
}
