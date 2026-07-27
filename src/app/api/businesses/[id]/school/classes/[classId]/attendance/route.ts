import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendAbsenceNotification } from "@/lib/email"

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

  // Send absence notification emails (fire-and-forget)
  const absentIds = records.filter(r => !r.present).map(r => r.clientId)
  if (absentIds.length > 0) {
    const schoolClass = await prisma.schoolClass.findUnique({
      where: { id: classId },
      include: {
        group: { select: { name: true } },
        business: { select: { name: true } },
      },
    })
    if (schoolClass) {
      const classDate = new Date(schoolClass.date).toLocaleDateString("es-CL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
      const clients = await prisma.client.findMany({
        where: { id: { in: absentIds } },
        select: { id: true, name: true, email: true },
      })
      for (const client of clients) {
        if (client.email) {
          sendAbsenceNotification({
            clientName: client.name,
            clientEmail: client.email,
            businessName: schoolClass.business.name,
            groupName: schoolClass.group.name,
            classDate,
          }).catch(() => {})
        }
      }
    }
  }

  const attendance = await prisma.schoolAttendance.findMany({
    where: { classId },
    include: { client: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ attendance })
}
