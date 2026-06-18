import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isClinicalCategory } from "@/lib/clinical"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const business = await prisma.business.findUnique({
    where: { id },
    include: { subscription: true, locations: { where: { deletedAt: null } } },
  })

  return NextResponse.json({ business, subscription: business?.subscription || null })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const body = await req.json()

  // Auto-enable clinical records when category changes to a health category
  if (body.category) {
    const current = await prisma.business.findUnique({ where: { id }, select: { clinicalRecordEnabled: true } })
    if (!current?.clinicalRecordEnabled && isClinicalCategory(body.category)) {
      body.clinicalRecordEnabled = true
    }
  }

  const business = await prisma.business.update({ where: { id }, data: body })
  return NextResponse.json({ business })
}
