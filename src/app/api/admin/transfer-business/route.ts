// TEMPORARY — delete after use
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()

    const { slug } = await req.json()

    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true, name: true, ownerId: true },
    })
    if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })

    const user = await prisma.user.findUnique({
      where: { email: "josetomas@bullpadel.cl" },
      select: { id: true, name: true },
    })
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    if (business.ownerId === user.id) {
      return NextResponse.json({ ok: true, message: "Ya eres dueño de este negocio" })
    }

    await prisma.business.update({
      where: { id: business.id },
      data: { ownerId: user.id },
    })

    return NextResponse.json({
      ok: true,
      message: `Transferido: ${business.name} → ${user.name}`,
      sessionEmail: session?.user?.email ?? "no session",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 })
  }
}
