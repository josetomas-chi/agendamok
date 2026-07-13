import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "AgendaMok — Reservas online para tu negocio"
export const size = { width: 1200, height: 1200 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 1200,
          background: "#0d1117",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          position: "relative",
        }}
      >
        {/* Subtle glow background */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)",
            top: 300,
            left: 300,
          }}
        />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 0, marginBottom: 24 }}>
          <span style={{ fontSize: 120, fontWeight: 900, color: "white", letterSpacing: -3 }}>Agenda</span>
          <span style={{ fontSize: 120, fontWeight: 900, color: "#38bdf8", letterSpacing: -3 }}>Mok</span>
        </div>

        {/* Divider */}
        <div style={{ width: 80, height: 6, background: "#38bdf8", borderRadius: 3, marginBottom: 48 }} />

        {/* Tagline */}
        <div
          style={{
            fontSize: 44,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            lineHeight: 1.3,
            maxWidth: 800,
            marginBottom: 24,
          }}
        >
          Tus clientes reservan solos.
          <br />
          Tu negocio no para.
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginBottom: 64,
          }}
        >
          {["Reservas 24/7", "Recordatorios automáticos", "Sin no-shows"].map(f => (
            <div
              key={f}
              style={{
                fontSize: 26,
                color: "rgba(255,255,255,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: "#38bdf8", fontSize: 22 }}>·</span> {f}
            </div>
          ))}
        </div>

        {/* CTA pill */}
        <div
          style={{
            fontSize: 30,
            color: "#38bdf8",
            border: "2px solid rgba(56,189,248,0.5)",
            borderRadius: 50,
            padding: "16px 48px",
            marginBottom: 64,
          }}
        >
          30 días gratis · Sin tarjeta
        </div>

        {/* Domain */}
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.25)" }}>agendamok.cl</div>
      </div>
    ),
    { ...size }
  )
}
