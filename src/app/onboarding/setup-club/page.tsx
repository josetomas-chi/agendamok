"use client"

import { useRouter } from "next/navigation"
import { Trophy, MapPin, Users, Calendar, ArrowRight } from "lucide-react"

const GOLD = "#C9A84C"
const NAVY = "#0d1b2a"
const BORDER = "rgba(201,168,76,0.2)"

export default function SetupClubPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-4 py-12" style={{ background: NAVY }}>
      <div className="w-full max-w-lg space-y-8">

        <div className="text-center">
          <div className="inline-flex items-baseline gap-1">
            <span className="font-black text-2xl tracking-tight text-white uppercase">AgendaMok</span>
            <span className="font-black text-lg tracking-widest uppercase" style={{ color: GOLD }}>Sports</span>
          </div>
        </div>

        <div className="rounded-2xl p-6 space-y-6 text-center" style={{ background: "#111f2d", border: BORDER }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(201,168,76,0.12)", boxShadow: "0 0 32px rgba(201,168,76,0.25)" }}>
            <Trophy className="w-8 h-8" style={{ color: GOLD }} />
          </div>

          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide text-white">¡Tu club está listo!</h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(201,168,76,0.5)" }}>Ahora configura tus canchas, horarios y tarifas desde el panel.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-left">
            {[
              { icon: MapPin, title: "Agrega tus canchas", desc: "Define tarifas valle y punta por franja horaria.", href: "/dashboard/club/courts" },
              { icon: Calendar, title: "Configura el horario del club", desc: "Días de apertura, hora de inicio y cierre.", href: "/dashboard/club/settings" },
              { icon: Users, title: "Crea planes de membresía", desc: "Mensual, trimestral, anual — tú decides.", href: "/dashboard/club/memberships" },
            ].map(({ icon: Icon, title, desc, href }) => (
              <button key={href} onClick={() => router.push(href)}
                className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                style={{ border: BORDER, background: "rgba(201,168,76,0.04)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.1)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.04)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.12)" }}>
                  <Icon className="w-5 h-5" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-white">{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(201,168,76,0.45)" }}>{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(201,168,76,0.4)" }} />
              </button>
            ))}
          </div>

          <button onClick={() => router.push("/dashboard/club")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all"
            style={{ background: "rgba(201,168,76,0.15)", border: `1px solid ${GOLD}`, color: GOLD }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.25)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.15)" }}>
            Ir al panel del club <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
