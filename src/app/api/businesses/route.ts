import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  businessName: z.string().min(2),
  category: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).default("FREE"),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { businessName, category, slug, plan } = schema.parse(body)

    const existing = await prisma.business.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Ese slug ya está en uso" }, { status: 400 })
    }

    const business = await prisma.business.create({
      data: {
        ownerId: session.user.id,
        name: businessName,
        slug,
        category,
        subscription: {
          create: {
            plan,
            status: "TRIALING",
            trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        },
        locations: {
          create: { name: "Principal", isDefault: true },
        },
      },
    })

    return NextResponse.json({ business }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
