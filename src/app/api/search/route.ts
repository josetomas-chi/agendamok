import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category") || ""
  const lat = parseFloat(searchParams.get("lat") || "")
  const lng = parseFloat(searchParams.get("lng") || "")
  const radius = parseFloat(searchParams.get("radius") || "20")

  const businesses = await prisma.business.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(category && { category: { contains: category, mode: "insensitive" } }),
    },
    select: {
      id: true, name: true, slug: true, category: true,
      description: true, logo: true, address: true, city: true,
      phone: true, latitude: true, longitude: true,
      services: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, duration: true, price: true, color: true, description: true },
        orderBy: { price: "asc" },
        take: 5,
      },
    },
  })

  type BizRaw = typeof businesses[number]
  type BizWithDistance = BizRaw & { distance: number | null }

  const withDistance: BizWithDistance[] = businesses
    .map((b: BizRaw): BizWithDistance => ({
      ...b,
      distance: !isNaN(lat) && !isNaN(lng) && b.latitude && b.longitude
        ? haversineKm(lat, lng, b.latitude, b.longitude)
        : null,
    }))
    .filter((b: BizWithDistance) => {
      if (!isNaN(lat) && !isNaN(lng) && b.latitude && b.longitude) {
        return (b.distance ?? Infinity) <= radius
      }
      return true
    })
    .sort((a: BizWithDistance, b: BizWithDistance) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return a.name.localeCompare(b.name)
    })

  return NextResponse.json({ businesses: withDistance })
}
