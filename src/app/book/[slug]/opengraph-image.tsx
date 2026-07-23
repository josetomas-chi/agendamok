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
  const logo = business?.logo ?? null

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        {logo ? (
          /* Logo fills the frame, cropped to fill */
          <img
            src={logo}
            width={1200}
            height={630}
            style={{ objectFit: "cover", position: "absolute", top: 0, left: 0, opacity: 0.15 }}
          />
        ) : null}

        {/* Center content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "40px",
          position: "relative",
        }}>
          {logo ? (
            <img
              src={logo}
              width={340}
              height={340}
              style={{ borderRadius: "40px", objectFit: "contain" }}
            />
          ) : (
            <div style={{
              width: "280px", height: "280px", borderRadius: "40px",
              background: "#0ea5e9", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "140px", color: "white",
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{
            fontSize: "36px", fontWeight: 700, color: "white",
            textAlign: "center", display: "flex",
          }}>
            {name}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
