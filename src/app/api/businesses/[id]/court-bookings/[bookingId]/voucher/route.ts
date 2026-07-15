import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint — no auth required (client uploads after booking)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const { id, bookingId } = await params

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId: id, deletedAt: null },
  })
  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
  if (!validTypes.includes(file.type) && !file.type.startsWith("image/"))
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 })
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 })

  const body = new FormData()
  body.append("file", file)
  body.append("upload_preset", uploadPreset)
  body.append("folder", "agendamok/vouchers")

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body })
  if (!res.ok) return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 })

  const data = await res.json()
  await prisma.courtBooking.update({
    where: { id: bookingId },
    data: { transferVoucher: data.secure_url },
  })

  return NextResponse.json({ url: data.secure_url })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const { id, bookingId } = await params
  const { auth } = await import("@/lib/auth")
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  await prisma.courtBooking.update({
    where: { id: bookingId, businessId: id },
    data: { transferVoucher: null },
  })
  return NextResponse.json({ ok: true })
}
