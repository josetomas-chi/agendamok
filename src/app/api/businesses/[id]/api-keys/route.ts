import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const keys = await prisma.apiKey.findMany({
    where: { businessId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ keys })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const { name } = await req.json()
  const key = `amk_${randomBytes(24).toString("hex")}`

  const apiKey = await prisma.apiKey.create({
    data: { businessId: id, name: name || "Default", key },
  })

  return NextResponse.json({ apiKey }, { status: 201 })
}
