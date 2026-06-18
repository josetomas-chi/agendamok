import { prisma } from "@/lib/prisma"

export async function authenticateApiKey(req: Request) {
  const key = req.headers.get("x-api-key")
  if (!key) return null

  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    select: { businessId: true, id: true },
  })
  if (!apiKey) return null

  // Update lastUsedAt async — don't await
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return apiKey.businessId
}
