import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BookingFlow } from "@/components/booking/booking-flow"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ embed?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const business = await prisma.business.findUnique({
    where: { slug, deletedAt: null },
    select: { name: true, description: true },
  })
  if (!business) return { title: "Negocio no encontrado" }
  return { title: `Reservar turno — ${business.name}` }
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { embed } = await searchParams
  const isEmbed = embed === "1"

  const business = await prisma.business.findUnique({
    where: { slug, deletedAt: null },
    include: {
      services: {
        where: { isActive: true, deletedAt: null },
        include: { category: true },
        orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
      },
      staff: {
        where: { isActive: true, deletedAt: null },
        include: {
          user: { select: { name: true, image: true } },
          schedules: true,
          services: { select: { id: true } },
        },
      },
      locations: { where: { deletedAt: null } },
    },
  })

  if (!business) notFound()

  return <BookingFlow business={business} embed={isEmbed} />
}
