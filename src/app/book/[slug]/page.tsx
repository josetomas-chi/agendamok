import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import BookingClient from "./booking-client"

type Props = { params: Promise<{ slug: string }> }

async function getBusiness(slug: string) {
  return prisma.business.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, category: true, description: true,
      logo: true, phone: true, address: true, city: true,
    },
  })
}

async function getFullBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true, name: true, category: true, description: true, logo: true, phone: true,
      address: true, city: true, onlinePaymentsEnabled: true, mpConnected: true, primaryColor: true,
      coverImage: true, coverImagePositionY: true, businessType: true, chatBotEnabled: true, accessMode: true,
      bankName: true, bankAccountHolder: true, bankAccountType: true, bankAccountNumber: true, bankRut: true, bankEmail: true,
      clubSettings: { select: { bookingWindowDays: true, donationMode: true, donationNote: true } },
      courts: {
        where: { isActive: true },
        select: { id: true, name: true, sport: true, color: true, description: true, image: true, sponsorName: true, sponsorLogo: true, sponsorUrl: true, pricingRules: { select: { days: true, startTime: true, endTime: true, price: true, fixedSlots: true } } },
        orderBy: { sortOrder: "asc" },
      },
      services: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true, duration: true, price: true, color: true, categoryId: true,
          category: { select: { id: true, name: true, order: true } } },
        orderBy: [{ category: { order: "asc" } }, { name: "asc" }],
      },
      staff: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, color: true, specialty: true, bio: true, user: { select: { name: true, image: true } } },
      },
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) return { title: "Negocio no encontrado" }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"
  const url = `${base}/book/${slug}`
  const title = `Reservar en ${business.name}`
  const description = business.description
    ?? `Reserva tu hora en ${business.name}${business.city ? ` — ${business.city}` : ""}. Booking online 24/7 sin llamadas.`
  const ogImage = `${base}/book/${slug}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "es_CL",
      images: [{ url: ogImage, width: 1200, height: 1200, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: { canonical: url },
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  // Fetch full business data server-side to avoid client waterfall
  const business = await getFullBusiness(slug)
  if (!business) notFound()

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description ?? undefined,
    image: business.logo ?? undefined,
    telephone: business.phone ?? undefined,
    address: business.address ? {
      "@type": "PostalAddress",
      streetAddress: business.address,
      addressLocality: business.city ?? undefined,
      addressCountry: "CL",
    } : undefined,
    url: `${base}/book/${slug}`,
    makesOffer: { "@type": "Offer", description: "Reserva online de turnos 24/7" },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookingClient slug={slug} initialName={business.name} initialLogo={business.logo} initialBusiness={business} />
    </>
  )
}
