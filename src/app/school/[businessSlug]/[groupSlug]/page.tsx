import { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import SchoolGroupClient from "./school-client"

type Props = { params: Promise<{ businessSlug: string; groupSlug: string }> }

async function getData(businessSlug: string, groupSlug: string) {
  const business = await prisma.business.findFirst({
    where: { slug: businessSlug, isActive: true, deletedAt: null },
    select: { id: true, name: true, logo: true },
  })
  if (!business) return null

  const group = await prisma.schoolGroup.findFirst({
    where: { businessId: business.id, slug: groupSlug, isActive: true },
    select: { name: true, sport: true, level: true, image: true, notes: true },
  })
  return group ? { business, group } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug, groupSlug } = await params
  const data = await getData(businessSlug, groupSlug)

  if (!data) return { title: "Escuela deportiva" }

  const { business, group } = data
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.cl"
  const title = `${group.name} — ${business.name}`
  const description = group.notes
    ?? `Inscríbete en ${group.name}${group.sport ? ` de ${group.sport}` : ""}${group.level ? ` · ${group.level}` : ""} en ${business.name}.`

  const image = group.image ?? business.logo ?? `${base}/og-image.png`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/school/${businessSlug}/${groupSlug}`,
      type: "website",
      locale: "es_CL",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  }
}

export default async function SchoolGroupPage({ params }: Props) {
  const { businessSlug, groupSlug } = await params
  return <SchoolGroupClient businessSlug={businessSlug} groupSlug={groupSlug} />
}
