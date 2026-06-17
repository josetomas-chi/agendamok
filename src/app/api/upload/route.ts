import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Cloudinary unsigned upload proxy — keeps auth check server-side
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imágenes JPG, PNG o WebP" }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 5MB" }, { status: 400 })
  }

  const body = new FormData()
  body.append("file", file)
  body.append("upload_preset", uploadPreset)
  body.append("folder", "agendamok")

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("Cloudinary error:", err)
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ url: data.secure_url })
}
