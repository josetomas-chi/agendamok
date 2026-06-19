import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("client-session")?.value

  if (token) {
    await prisma.clientSession.deleteMany({ where: { token } }).catch(() => {})
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("client-session", "", { expires: new Date(0), path: "/" })
  return res
}
