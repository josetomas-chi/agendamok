import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Flexible column matching — maps common variations to our field names
function normalize(key: string) {
  return key.toLowerCase().trim()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[\s_\-]+/g, "")
}

const FIELD_MAP: Record<string, string> = {
  // nombre
  nombre: "name", name: "name", firstname: "name", "primernombre": "name",
  // apellido
  apellido: "lastName", lastname: "lastName", surname: "lastName", "apellidos": "lastName",
  "segundonombre": "lastName",
  // rut
  rut: "rut", dni: "rut", cedula: "rut", documento: "rut", id: "rut",
  // email
  email: "email", correo: "email", mail: "email", "correoelectronico": "email",
  "emailaddress": "email",
  // phone
  telefono: "phone", phone: "phone", celular: "phone", movil: "phone",
  fono: "phone", tel: "phone", "numerodetelefono": "phone",
  // gender
  genero: "gender", gender: "gender", sexo: "gender",
  // notes
  notas: "notes", notes: "notes", observaciones: "notes", comentarios: "notes",
}

function mapRow(raw: Record<string, string>): {
  name?: string; lastName?: string; rut?: string
  email?: string; phone?: string; gender?: string; notes?: string
} {
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(raw)) {
    const field = FIELD_MAP[normalize(key)]
    if (field && val?.trim()) out[field] = val.trim()
  }
  return out
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const business = await prisma.business.findUnique({ where: { id, ownerId: session.user.id } })
  if (!business) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  let rawRows: Record<string, string>[]
  try {
    const body = await req.json()
    rawRows = body.rows
    if (!Array.isArray(rawRows)) throw new Error()
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
  }

  const rows = rawRows.map(mapRow)
  const valid = rows.filter(r => r.name && r.name.trim())
  if (valid.length === 0) return NextResponse.json({ error: "No hay filas válidas (se requiere al menos Nombre)" }, { status: 400 })

  const emails = valid.map(r => r.email?.toLowerCase()).filter(Boolean) as string[]
  const existing = await prisma.client.findMany({
    where: { businessId: id, email: { in: emails } },
    select: { email: true },
  })
  const existingEmails = new Set(existing.map(c => c.email?.toLowerCase()))

  let created = 0, skipped = 0

  for (const row of valid) {
    const email = row.email?.toLowerCase() || undefined
    if (email && existingEmails.has(email)) { skipped++; continue }

    const fullName = [row.name, row.lastName].filter(Boolean).join(" ")
    await prisma.client.create({
      data: {
        businessId: id,
        name: fullName,
        lastName: row.lastName || null,
        rut: row.rut || null,
        email: email || null,
        phone: row.phone || null,
        gender: row.gender || null,
        notes: row.notes || null,
      },
    })
    created++
  }

  return NextResponse.json({ created, skipped, total: valid.length })
}
