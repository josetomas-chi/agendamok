"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar, Users, Scissors, UserCheck, BarChart3,
  Settings, CreditCard, Megaphone, MapPin, LogOut, LayoutDashboard,
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
  { href: "/dashboard/locations", label: "Sedes", icon: MapPin },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r flex flex-col flex-shrink-0 h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Agenda Pro</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
