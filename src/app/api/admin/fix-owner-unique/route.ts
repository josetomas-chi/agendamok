// TEMPORARY — delete after use
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "businesses_ownerId_key"`)
    return NextResponse.json({ ok: true, message: "Index eliminado correctamente" })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
