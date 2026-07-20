"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar, Users, Scissors, UserCheck, BarChart3,
  Settings, CreditCard, Megaphone, MapPin, LogOut, LayoutDashboard, Star, Percent, FileText, HelpCircle, X, Trophy,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const GENERAL_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
      { href: "/dashboard/appointments", label: "Turnos", icon: Calendar },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/dashboard/services", label: "Servicios", icon: Scissors },
      { href: "/dashboard/staff", label: "Staff", icon: UserCheck },
      { href: "/dashboard/clients", label: "Clientes", icon: Users },
      { href: "/dashboard/locations", label: "Sedes", icon: MapPin },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
      { href: "/dashboard/commissions", label: "Comisiones", icon: Percent },
      { href: "/dashboard/quotes", label: "Presupuestos", icon: FileText },
    ],
  },
  {
    label: "Crecimiento",
    items: [
      { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
      { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
      { href: "/dashboard/surveys", label: "Encuestas", icon: Star },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/settings", label: "Configuración", icon: Settings },
    ],
  },
]

const SPORTS_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard/club", label: "Inicio", icon: LayoutDashboard },
    ],
  },
  {
    label: "Club",
    items: [
      { href: "/dashboard/club/courts", label: "Canchas", icon: MapPin },
      { href: "/dashboard/clients", label: "Clientes", icon: Users },
      { href: "/dashboard/club/memberships", label: "Membresías", icon: Trophy },
      { href: "/dashboard/club/tournaments", label: "Torneos", icon: Calendar },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
      { href: "/dashboard/quotes", label: "Presupuestos", icon: FileText },
    ],
  },
  {
    label: "Crecimiento",
    items: [
      { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/club/settings", label: "Config. club", icon: Trophy },
      { href: "/dashboard/settings", label: "Configuración", icon: Settings },
    ],
  },
]

// Sports theme tokens
const S = {
  bg: "#0d1b2a",
  bgHover: "rgba(201,168,76,0.08)",
  border: "rgba(201,168,76,0.15)",
  gold: "#C9A84C",
  goldDim: "rgba(201,168,76,0.5)",
  activeGradient: "linear-gradient(90deg, rgba(201,168,76,0.18) 0%, rgba(201,168,76,0.04) 100%)",
  label: "rgba(201,168,76,0.4)",
}

// Items accesibles para recepcionistas
const RECEPTIONIST_ALLOWED = new Set([
  "/dashboard",
  "/dashboard/appointments",
  "/dashboard/clients",
  "/dashboard/payments",
  "/dashboard/club",
  "/dashboard/club/courts",
])

export function Sidebar({ onClose, isSports = false, memberRole = "ADMIN" }: { onClose?: () => void; isSports?: boolean; memberRole?: "ADMIN" | "RECEPTIONIST" }) {
  const pathname = usePathname()
  const isReceptionist = memberRole === "RECEPTIONIST"

  const rawGroups = isSports ? SPORTS_GROUPS : GENERAL_GROUPS
  const groups = isReceptionist
    ? rawGroups.map(g => ({ ...g, items: g.items.filter(i => RECEPTIONIST_ALLOWED.has(i.href)) })).filter(g => g.items.length > 0)
    : rawGroups

  function isActive(href: string) {
    if (href === "/dashboard" || href === "/dashboard/club") return pathname === href
    return pathname.startsWith(href)
  }

  if (isSports) {
    return (
      <aside className="w-56 flex flex-col flex-shrink-0 h-screen" style={{ background: S.bg, borderRight: `1px solid ${S.border}` }}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 gap-2" style={{ borderBottom: `1px solid ${S.border}` }}>
          <Link href="/dashboard/club" className="flex items-center gap-2.5 flex-1" onClick={onClose}>
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: `0 0 12px rgba(201,168,76,0.5)` }}>
              <img src="/mok-icon.png" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <div className="leading-none">
              <div className="font-black text-[13px] tracking-tight text-white uppercase">AgendaMok</div>
              <div className="font-black text-[11px] tracking-widest uppercase" style={{ color: S.gold }}>Sports</div>
            </div>
          </Link>
          <button onClick={onClose} className="md:hidden p-1 transition-colors" style={{ color: S.goldDim }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto scrollbar-hide">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 mb-1.5" style={{ color: S.label }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href)
                  return (
                    <Link key={href} href={href} onClick={onClose}
                      className="relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-150"
                      style={active ? {
                        background: S.activeGradient,
                        boxShadow: `inset 2px 0 0 ${S.gold}`,
                        color: S.gold,
                      } : { color: "rgba(255,255,255,0.45)" }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = S.bgHover }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={active ? { color: S.gold } : {}} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4" style={{ borderTop: `1px solid ${S.border}` }}>
          <div className="pt-3 space-y-0.5">
            <Link href="/dashboard/help"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all w-full"
              style={{ color: S.goldDim }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = S.gold; (e.currentTarget as HTMLElement).style.background = S.bgHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = S.goldDim; (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              Ayuda
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] transition-all"
              style={{ color: "rgba(255,255,255,0.25)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLElement).style.background = S.bgHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    )
  }

  // ── GENERAL sidebar (unchanged) ──────────────────────────────────────────────
  return (
    <aside className="w-56 flex flex-col flex-shrink-0 h-screen" style={{ background: "#2a2a2e" }}>
      <div className="h-14 flex items-center px-4 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-1" onClick={onClose}>
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 12px rgba(56,189,248,0.4)" }}>
            <img src="/mok-icon.png" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white">Agenda<span className="text-sky-400">Mok</span></span>
        </Link>
        <button onClick={onClose} className="md:hidden p-1 text-white/30 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <nav className="flex-1 py-3 px-3 space-y-3 overflow-y-auto scrollbar-hide">
        {GENERAL_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href} onClick={onClose}
                    className={cn("relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                      active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]")}
                    style={active ? { background: "linear-gradient(90deg, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0.06) 100%)", boxShadow: "inset 2px 0 0 #38bdf8" } : undefined}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-sky-400" : "")} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="pt-3 space-y-0.5">
          <Link href="/dashboard/help"
            className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all w-full",
              pathname.startsWith("/dashboard/help") ? "text-amber-300 bg-amber-500/10" : "text-amber-400/50 hover:text-amber-300 hover:bg-amber-500/10")}>
            <HelpCircle className="w-4 h-4 flex-shrink-0" />Ayuda
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            <LogOut className="w-4 h-4" />Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
