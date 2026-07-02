"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar, Users, Scissors, UserCheck, BarChart3,
  Settings, CreditCard, Megaphone, MapPin, LogOut, LayoutDashboard, Star, Percent, FileText, HelpCircle, X,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { MokIcon } from "@/components/ui/mok-icon"
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
  {
    label: "Cuenta",
    items: [
      { href: "/dashboard/settings", label: "Configuración", icon: Settings },
    ],
  },
]

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="w-56 flex flex-col flex-shrink-0 h-screen" style={{ background: "#2a2a2e" }}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-1" onClick={onClose}>
          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 12px rgba(56,189,248,0.4)" }}>
            <img src="/icon.svg" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white">
            Agenda<span className="text-sky-400">Mok</span>
          </span>
        </Link>
        <button onClick={onClose} className="md:hidden p-1 text-white/30 hover:text-white/70 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-3 space-y-3 overflow-hidden">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25 px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
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
