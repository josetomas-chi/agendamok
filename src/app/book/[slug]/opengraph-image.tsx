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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d1b2a 0%, #1c2e42 50%, #0d1b2a 100%)",
          fontFamily: "sans-serif",
          gap: "32px",
        }}
      >
        <div style={{
          position: "absolute",
          width: "500px", height: "500px",
          borderRadius: "50%",
          border: "1px solid rgba(56,189,248,0.12)",
          top: "65px", left: "350px",
          display: "flex",
        }} />

        {logo ? (
          <img
            src={logo}
            width={160}
            height={160}
            style={{ borderRadius: "24px", objectFit: "contain", background: "white", padding: "12px" }}
          />
        ) : (
          <div style={{
            width: "160px", height: "160px", borderRadius: "24px",
            background: "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "72px", color: "white",
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "56px", fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.1 }}>
            {name}
          </div>
          {city && (
            <div style={{ fontSize: "28px", color: "rgba(255,255,255,0.5)", display: "flex" }}>
              {city}
            </div>
          )}
        </div>

        <div style={{
          padding: "16px 40px", borderRadius: "999px",
          background: "#38bdf8", color: "#0d1b2a",
          fontSize: "26px", fontWeight: 700,
          display: "flex",
        }}>
          Reservar online
        </div>

        <div style={{
          position: "absolute", bottom: "32px",
          fontSize: "20px", color: "rgba(255,255,255,0.25)",
          display: "flex",
        }}>
          agendamok.cl
        </div>
      </div>
    ),
    { ...size }
  )
}
