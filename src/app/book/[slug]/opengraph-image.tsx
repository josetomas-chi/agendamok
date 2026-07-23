import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const alt = "Reservar online"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await prisma.business.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { name: true, logo: true, city: true },
  })

  const name = business?.name ?? "Reserva online"
  const city = business?.city ?? ""
  const logo = business?.logo ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "row",
          background: "linear-gradient(135deg, #0d1b2a 0%, #1a2e42 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left — logo panel */}
        <div style={{
          width: "420px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          borderRight: "1px solid rgba(56,189,248,0.12)",
          flexShrink: 0,
        }}>
          {logo ? (
            <img
              src={logo}
              width={300}
              height={300}
              style={{ borderRadius: "32px", objectFit: "contain" }}
            />
          ) : (
            <div style={{
              width: "240px", height: "240px", borderRadius: "40px",
              background: "#0ea5e9", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "120px", color: "white",
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Right — text panel */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 72px",
          gap: "24px",
        }}>
          {/* AgendaMok badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: "#38bdf8", display: "flex",
            }} />
            <div style={{ fontSize: "22px", color: "#38bdf8", letterSpacing: "0.08em", display: "flex" }}>
              AGENDAMOK
            </div>
          </div>

          {/* Business name */}
          <div style={{
            fontSize: name.length > 22 ? "48px" : "62px",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.05,
            display: "flex",
          }}>
            {name}
          </div>

          {city && (
            <div style={{ fontSize: "26px", color: "rgba(255,255,255,0.45)", display: "flex" }}>
              {city}
            </div>
          )}

          {/* CTA pill */}
          <div style={{
            marginTop: "16px",
            padding: "18px 44px",
            borderRadius: "999px",
            background: "#38bdf8",
            color: "#0d1b2a",
            fontSize: "28px",
            fontWeight: 700,
            display: "flex",
            width: "fit-content",
          }}>
            Reservar online →
          </div>

          {/* Domain */}
          <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.2)", display: "flex", marginTop: "8px" }}>
            agendamok.cl
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
