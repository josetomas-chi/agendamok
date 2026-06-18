import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; staffId: string; exId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { exId } = await params

  await prisma.availabilityException.delete({ where: { id: exId } })
  return NextResponse.json({ success: true })
}
