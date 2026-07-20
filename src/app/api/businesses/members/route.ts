import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

async function getAdminBusiness(userId: string) {
  const business = await prisma.business.findUnique({ where: { ownerId: userId } })
  if (business) return business
  const member = await prisma.businessMember.findFirst({
    where: { userId, role: "ADMIN", acceptedAt: { not: null } },
    include: { business: true },
  })
  return member?.business ?? null
}

// GET — list members
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await getAdminBusiness(session.user.id)
  if (!business) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

  const members = await prisma.businessMember.findMany({
    where: { businessId: business.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ members })
}

// POST — invite receptionist
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const business = await getAdminBusiness(session.user.id)
  if (!business) return NextResponse.json({ error: "No tienes un negocio" }, { status: 400 })

  const { email, name } = await req.json()
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  // Check if already a member
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const alreadyMember = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: existing.id } },
    })
    if (alreadyMember) return NextResponse.json({ error: "Este usuario ya es miembro del negocio" }, { status: 409 })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

  if (existing) {
    // User exists — add as member directly (pending acceptance)
    await prisma.businessMember.create({
      data: { businessId: business.id, userId: existing.id, role: "RECEPTIONIST", inviteToken: token, inviteEmail: email },
    })
  } else {
    // Create placeholder user
    const newUser = await prisma.user.create({
      data: { email, name: name || email.split("@")[0], role: "RECEPTIONIST" },
    })
    await prisma.businessMember.create({
      data: { businessId: business.id, userId: newUser.id, role: "RECEPTIONIST", inviteToken: token, inviteEmail: email },
    })
  }

  // Send invite email
  try {
    await resend.emails.send({
      from: "AgendaMok <noreply@agendamok.cl>",
      to: email,
      subject: `Invitación a ${business.name} en AgendaMok`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#0ea5e9">Te invitaron a ${business.name}</h2>
          <p>Fuiste invitado como <strong>Recepcionista</strong> en AgendaMok.</p>
          <p>Haz clic en el botón para crear tu cuenta y acceder al panel:</p>
          <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0ea5e9;color:white;border-radius:8px;text-decoration:none;font-weight:600">
            Aceptar invitación
          </a>
          <p style="color:#999;font-size:12px">Este link expira en 7 días.</p>
        </div>
      `,
    })
  } catch {
    // Email failed but invite was created — not critical
  }

  return NextResponse.json({ success: true, inviteUrl })
}
