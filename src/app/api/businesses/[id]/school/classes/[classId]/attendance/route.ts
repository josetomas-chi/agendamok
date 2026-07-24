import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string; classId: string }> }

// PATCH: update attendance for one or many students
// body: { records: [{ clientId, present }] }
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { classId } = await params
  const { records } = await req.json() as { records: { clientId: string; present: boolean }[] }

  await Promise.all(records.map(r =>
    prisma.schoolAttendance.upsert({
      where: { classId_clientId: { classId, clientId: r.clientId } },
      update: { present: r.present },
      create: { classId, clientId: r.clientId, present: r.present },
    })
  ))

  const attendance = await prisma.schoolAttendance.findMany({
    where: { classId },
    include: { client: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ attendance })
}
