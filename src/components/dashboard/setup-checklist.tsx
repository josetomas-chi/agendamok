"use client"

import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface SetupChecklistProps {
  hasServices: boolean
  hasStaff: boolean
  hasSchedule: boolean
  slug: string
  isSports?: boolean
}

export function SetupChecklist({ hasServices, hasStaff, hasSchedule, slug, isSports }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false)

  const steps = [
    {
      done: hasServices,
      label: "Agrega tu primer servicio",
      desc: "Define qué ofreces, su duración y precio.",
      href: "/dashboard/services",
    },
    {
      done: hasStaff,
      label: "Configura tu equipo",
      desc: "Añade profesionales y asígnales servicios.",
      href: "/dashboard/staff",
    },
    {
      done: hasSchedule,
      label: "Define los horarios de atención",
      desc: "Sin horarios, los clientes no pueden reservar.",
      href: "/dashboard/staff",
    },
    {
      done: true,
      label: "Copia tu link de reservas",
      desc: `agendamok.cl/book/${slug}`,
      href: `/book/${slug}`,
      external: true,
    },
  ]

  const completed = steps.filter(s => s.done).length
  const allDone = completed === steps.length

  if (dismissed || allDone) return null

  if (isSports) {
    const NAVY = "#0d1b2a"
    const GOLD = "#C9A84C"
    const BORDER = "rgba(201,168,76,0.25)"
    return (
      <div style={{ borderRadius: 16, border: `1px solid ${BORDER}`, background: "rgba(13,27,42,0.06)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles style={{ width: 16, height: 16, color: GOLD }} />
            <span style={{ fontWeight: 600, color: NAVY, fontSize: 14 }}>Configura tu negocio</span>
            <span style={{ fontSize: 12, color: "#666", marginLeft: 4 }}>{completed}/{steps.length} pasos</span>
          </div>
          <button onClick={() => setDismissed(true)} style={{ color: "#999", background: "none", border: "none", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
        <div style={{ width: "100%", background: "rgba(0,0,0,0.1)", borderRadius: 99, height: 4, marginBottom: 12 }}>
          <div style={{ background: GOLD, height: 4, borderRadius: 99, width: `${(completed / steps.length) * 100}%`, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {steps.map((step, i) => (
            <Link key={i} href={step.href} target={step.external ? "_blank" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12,
                opacity: step.done ? 0.45 : 1, pointerEvents: step.done ? "none" : "auto",
                textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!step.done) (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              {step.done
                ? <CheckCircle2 style={{ width: 20, height: 20, color: GOLD, flexShrink: 0 }} />
                : <Circle style={{ width: 20, height: 20, color: "#aaa", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: step.done ? "#999" : NAVY, textDecoration: step.done ? "line-through" : "none" }}>{step.label}</div>
                <div style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.desc}</div>
              </div>
              {!step.done && <ChevronRight style={{ width: 16, height: 16, color: "#aaa", flexShrink: 0 }} />}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 p-5" style={{ background: "rgba(14,165,233,0.06)" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span className="font-semibold text-[#1c1c1e] text-sm">Configura tu negocio</span>
          <span className="text-xs text-[#1c1c1e]/40 ml-1">{completed}/{steps.length} pasos</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[#1c1c1e]/30 hover:text-[#1c1c1e]/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="w-full bg-black/10 rounded-full h-1.5 mb-4">
        <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <Link key={i} href={step.href} target={step.external ? "_blank" : undefined}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${step.done ? "opacity-40 cursor-default pointer-events-none" : "hover:bg-sky-500/10 cursor-pointer"}`}
          >
            {step.done
              ? <CheckCircle2 className="w-5 h-5 text-sky-500 flex-shrink-0" />
              : <Circle className="w-5 h-5 text-[#1c1c1e]/25 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.done ? "line-through text-[#1c1c1e]/30" : "text-[#1c1c1e]"}`}>{step.label}</div>
              <div className="text-xs text-[#1c1c1e]/50 truncate">{step.desc}</div>
            </div>
            {!step.done && <ChevronRight className="w-4 h-4 text-[#1c1c1e]/25 group-hover:text-sky-500 transition-colors flex-shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
