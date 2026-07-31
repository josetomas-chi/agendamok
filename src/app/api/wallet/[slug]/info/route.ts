import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: {
      name: true, logo: true, primaryColor: true,
      flowApiKey: true, onlinePaymentsEnabled: true,
      bankName: true, bankAccountHolder: true, bankAccountNumber: true,
      bankAccountType: true, bankRut: true, bankEmail: true,
    },
  })
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 })
  return NextResponse.json({
    name: business.name,
    logo: business.logo,
    primaryColor: business.primaryColor,
    flowEnabled: !!(business.flowApiKey && business.onlinePaymentsEnabled),
    bankName: business.bankName,
    bankAccountHolder: business.bankAccountHolder,
    bankAccountNumber: business.bankAccountNumber,
    bankAccountType: business.bankAccountType,
    bankRut: business.bankRut,
    bankEmail: business.bankEmail,
  })
}
