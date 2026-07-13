import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const alt = "Reserva online"
export const size = { width: 1200, height: 1200 }
export const contentType = "image/png"

type Props = { params: Promise<{ slug: string }> }

export default async function OGImage({ params }: Props) {
  const { slug } = await params

  const business = await prisma.business.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      name: true, city: true, businessType: true, logo: true, category: true,
      courts: { select: { sport: true }, distinct: ["sport"], where: { deletedAt: null } },
    },
  })

  const name = business?.name ?? "Club Deportivo"
  const city = business?.city ?? ""
  const isSports = business?.businessType === "SPORTS_CLUB"
  const sports = [...new Set((business?.courts ?? []).map(c => c.sport).filter(Boolean))] as string[]
  const tags = isSports ? sports : (business?.category ? [business.category] : [])

  // Try to load logo image
  let logoData: string | null = null
  if (business?.logo) {
    try {
      const res = await fetch(business.logo)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const b64 = Buffer.from(buf).toString("base64")
        const mime = res.headers.get("content-type") || "image/png"
        logoData = `data:${mime};base64,${b64}`
      }
    } catch { /* skip */ }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 1200,
          background: "#0d1b2a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle radial glow */}
        <div style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)",
          top: 250,
          left: 250,
          display: "flex",
        }} />

        {/* Top label */}
        <div style={{
          position: "absolute",
          top: 80,
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          display: "flex",
        }}>
          {isSports ? "reserva tu cancha" : "reserva online"}
        </div>

        {/* Logo if available */}
        {logoData ? (
          <img
            src={logoData}
            style={{
              width: 200,
              height: 200,
              objectFit: "contain",
              marginBottom: 40,
              borderRadius: 20,
              background: "white",
              padding: 16,
            }}
          />
        ) : (
          <div style={{
            width: 100,
            height: 4,
            background: "#38bdf8",
            borderRadius: 2,
            marginBottom: 48,
            display: "flex",
          }} />
        )}

        {/* Business name */}
        <div style={{
          fontSize: name.length > 16 ? 80 : 100,
          fontWeight: 900,
          color: "white",
          textAlign: "center",
          lineHeight: 1.05,
          maxWidth: 900,
          letterSpacing: -2,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {name}
        </div>

        {/* City */}
        {city ? (
          <div style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.4)",
            marginTop: 20,
            letterSpacing: "0.08em",
            display: "flex",
          }}>
            {city.toUpperCase()}
          </div>
        ) : null}

        {/* Tags (sports or category) */}
        {tags.length > 0 && (
          <div style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 900,
          }}>
            {tags.map(t => (
              <div key={t} style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#38bdf8",
                background: "rgba(56,189,248,0.1)",
                border: "1px solid rgba(56,189,248,0.3)",
                borderRadius: 40,
                padding: "10px 28px",
                display: "flex",
              }}>
                {t}
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{
          width: 60,
          height: 2,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          marginTop: 60,
          display: "flex",
        }} />

        {/* Bottom domain */}
        <div style={{
          position: "absolute",
          bottom: 70,
          fontSize: 28,
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.05em",
          display: "flex",
        }}>
          agendamok.cl
        </div>
      </div>
    ),
    { ...size }
  )
}
