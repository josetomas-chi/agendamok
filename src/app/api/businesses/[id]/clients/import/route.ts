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
  const [owner, member] = await Promise.all([
    prisma.business.findFirst({ where: { id, ownerId: session.user.id }, select: { id: true } }),
    prisma.businessMember.findFirst({ where: { businessId: id, userId: session.user.id, acceptedAt: { not: null } }, select: { id: true } }),
  ])
  if (!owner && !member) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

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

  const ruts = valid.map(r => r.rut).filter(Boolean) as string[]
  const emails = valid.map(r => r.email?.toLowerCase()).filter(Boolean) as string[]

  const existingByRut = ruts.length > 0
    ? new Set((await prisma.client.findMany({
        where: { businessId: id, rut: { in: ruts } },
        select: { rut: true },
      })).map((c: { rut: string | null }) => c.rut!))
    : new Set<string>()

  // Case-insensitive email lookup
  const existingByEmail = emails.length > 0
    ? new Set((await prisma.client.findMany({
        where: { businessId: id, email: { in: emails, mode: "insensitive" } },
        select: { email: true },
      })).map((c: { email: string | null }) => c.email!.toLowerCase()))
    : new Set<string>()

  // Dedup within batch and against existing records
  const seenRuts = new Set<string>()
  const seenEmails = new Set<string>()
  const toInsert: {
    businessId: string; name: string; lastName: string | null; rut: string | null
    email: string | null; phone: string | null; gender: string | null; notes: string | null
  }[] = []
  let skipped = 0

  for (const row of valid) {
    const rut = row.rut || undefined
    const email = row.email?.toLowerCase() || undefined
    if (rut && (existingByRut.has(rut) || seenRuts.has(rut))) { skipped++; continue }
    if (!rut && email && (existingByEmail.has(email) || seenEmails.has(email))) { skipped++; continue }

    const fullName = [row.name, row.lastName].filter(Boolean).join(" ")
    toInsert.push({
      businessId: id,
      name: fullName,
      lastName: row.lastName || null,
      rut: rut || null,
      email: email || null,
      phone: row.phone || null,
      gender: row.gender || null,
      notes: row.notes || null,
    })
    if (rut) seenRuts.add(rut)
    if (email) seenEmails.add(email)
  }

  // Bulk insert — skipDuplicates handles any remaining race conditions
  const result = await prisma.client.createMany({ data: toInsert, skipDuplicates: true })

  return NextResponse.json({ created: result.count, skipped: skipped + (toInsert.length - result.count), total: valid.length })
}
