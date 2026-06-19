"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar, Users, Scissors, UserCheck, BarChart3,
  Settings, CreditCard, Megaphone, MapPin, LogOut, LayoutDashboard, Star, Percent, FileText, HelpCircle,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

const groups = [
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
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-56 flex flex-col flex-shrink-0 h-screen" style={{ background: "#2a2a2e" }}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: "0 0 12px rgba(14,165,233,0.5)" }}>
            <Calendar className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white">
            Agenda<span className="text-sky-400">Mok</span>
          </span>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25 px-2 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                      active
                        ? "text-white"
                        : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                    )}
                    style={active ? {
                      background: "linear-gradient(90deg, rgba(14,165,233,0.18) 0%, rgba(14,165,233,0.06) 100%)",
                      boxShadow: "inset 2px 0 0 #38bdf8",
                    } : undefined}
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

      {/* Footer */}
      <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="pt-3 space-y-0.5">
          <Link
            href="/dashboard/help"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all w-full",
              pathname.startsWith("/dashboard/help")
                ? "text-amber-300 bg-amber-500/10"
                : "text-amber-400/50 hover:text-amber-300 hover:bg-amber-500/10"
            )}
          >
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            Ayuda
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-lg text-[13px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
