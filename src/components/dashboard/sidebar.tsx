"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar, Users, Scissors, UserCheck, BarChart3,
  Settings, CreditCard, Megaphone, MapPin, LogOut, LayoutDashboard, Star, Percent, Stethoscope, FileText, HelpCircle,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/appointments", label: "Turnos", icon: Calendar },
  { href: "/dashboard/services", label: "Servicios", icon: Scissors },
  { href: "/dashboard/staff", label: "Staff", icon: UserCheck },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  { href: "/dashboard/surveys", label: "Encuestas", icon: Star },
  { href: "/dashboard/commissions", label: "Comisiones", icon: Percent },
  { href: "/dashboard/locations", label: "Sedes", icon: MapPin },
  { href: "/dashboard/quotes", label: "Presupuestos", icon: FileText },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
  { href: "/dashboard/help", label: "Ayuda", icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-[#3a3a3c] border-r border-white/10 flex flex-col flex-shrink-0 h-screen">
      {/* Logo */}
      <div className="h-14 border-b border-white/10 flex items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Agenda<span className="text-sky-400">Mok</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
          const isHelp = href === "/dashboard/help"
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sky-500/20 text-sky-300 border border-sky-400/20"
                  : isHelp
                  ? "text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300"
                  : "text-white/50 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-sky-400" : isHelp ? "text-amber-400/70" : "")} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-white/40 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
