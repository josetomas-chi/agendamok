"use client"

import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface SetupChecklistProps {
  hasServices: boolean
  hasStaff: boolean
  hasSchedule: boolean
  slug: string
}

export function SetupChecklist({ hasServices, hasStaff, hasSchedule, slug }: SetupChecklistProps) {
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
      desc: `agendamok.vercel.app/book/${slug}`,
      href: `/book/${slug}`,
      external: true,
    },
  ]

  const completed = steps.filter(s => s.done).length
  const allDone = completed === steps.length

  if (dismissed || allDone) return null

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-white text-sm">Configura tu negocio</span>
          <span className="text-xs text-white/40 ml-1">{completed}/{steps.length} pasos</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-white/30 hover:text-white/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full bg-slate-700/40 rounded-full h-1.5 mb-4">
        <div
          className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            target={step.external ? "_blank" : undefined}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
              step.done
                ? "opacity-50 cursor-default pointer-events-none"
                : "hover:bg-white/5 cursor-pointer"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-white/25 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.done ? "line-through text-white/30" : "text-white"}`}>
                {step.label}
              </div>
              <div className="text-xs text-white/40 truncate">{step.desc}</div>
            </div>
            {!step.done && (
              <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-sky-400 transition-colors flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
