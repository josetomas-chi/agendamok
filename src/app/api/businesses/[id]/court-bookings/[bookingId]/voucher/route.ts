import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { utcToChileLocal } from "@/lib/timezone"

// Public endpoint — no auth required (client uploads after booking)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; bookingId: string }> }) {
  const { id, bookingId } = await params

  const booking = await prisma.courtBooking.findFirst({
    where: { id: bookingId, businessId: id, deletedAt: null },
    include: {
      client: true,
      court: { select: { name: true } },
      business: { select: { name: true, owner: { select: { name: true, email: true } } } },
    },
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

  // Notify owner that client uploaded a transfer voucher
  const owner = booking.business.owner
  if (owner?.email && process.env.RESEND_API_KEY) {
    const localStart = utcToChileLocal(booking.startTime)
    const dateStr = localStart.toLocaleDateString("es-CL")
    const timeStr = localStart.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    resend.emails.send({
      from: "AgendaMok <no-reply@agendamok.cl>",
      to: owner.email,
      subject: `Comprobante de transferencia recibido — ${booking.client.name}`,
      html: `<p>Hola ${owner.name ?? ""},</p><p><strong>${booking.client.name}</strong> subió un comprobante de transferencia para su reserva de <strong>${booking.court.name}</strong> el ${dateStr} a las ${timeStr} hrs.</p><p><a href="${data.secure_url}">Ver comprobante</a></p><p>Precio: $${Number(booking.price).toLocaleString("es-CL")}</p>`,
    }).catch(() => {})
  }

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
