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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) return { title: "Negocio no encontrado" }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"
  const url = `${base}/book/${slug}`
  const title = `Reservar en ${business.name}`
  const description = business.description
    ?? `Reserva tu hora en ${business.name}${business.city ? ` — ${business.city}` : ""}. Booking online 24/7 sin llamadas.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "es_CL",
      images: business.logo ? [{ url: business.logo, alt: business.name }] : [],
    },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  const business = await getBusiness(slug)
  if (!business) notFound()

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"

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
      <BookingClient slug={slug} />
    </>
  )
}
