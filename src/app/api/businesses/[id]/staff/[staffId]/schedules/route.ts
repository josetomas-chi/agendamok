import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { staffId } = await params
  const { schedules } = await req.json()

  await prisma.$transaction(
    schedules.map((s: { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean }) =>
      prisma.workSchedule.upsert({
        where: { staffId_dayOfWeek: { staffId, dayOfWeek: s.dayOfWeek } },
        update: { startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
        create: { staffId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isWorking: s.isWorking },
      })
    )
  )

  return NextResponse.json({ success: true })
}
