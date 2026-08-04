import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import LocationsClient from "./locations-client"

export default async function LocationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const cookieStore = await cookies()
  const activeBusinessId = cookieStore.get("active-business-id")?.value

  let business = activeBusinessId
    ? await prisma.business.findFirst({
        where: {
          id: activeBusinessId,
          OR: [
            { ownerId: session.user.id },
            { members: { some: { userId: session.user.id, acceptedAt: { not: null } } } },
          ],
        },
        select: { id: true },
      })
    : null

  if (!business) {
    business = await prisma.business.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
  }

  if (!business) redirect("/onboarding")

  const locations = await prisma.location.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  })

  return (
    <LocationsClient
      businessId={business.id}
      initialLocations={locations.map((l: typeof locations[0]) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        city: l.city,
        country: l.country,
        phone: l.phone,
        timezone: l.timezone,
        isDefault: l.isDefault,
        isActive: l.isActive,
      }))}
    />
  )
}
