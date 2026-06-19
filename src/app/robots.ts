import { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://agendamok.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terminos", "/privacidad"],
        disallow: ["/dashboard", "/api/", "/cancelar", "/login"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
