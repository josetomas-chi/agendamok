"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, Users, CreditCard, BarChart3, Settings, LogOut, Shield } from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Negocios", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex flex-col flex-shrink-0 h-screen border-r border-white/[0.07]" style={{ background: "oklch(0.16 0.02 260)" }}>
      <div className="h-16 flex items-center px-5 border-b border-white/[0.07]">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Agenda<span className="text-sky-400">Mok</span></span>
            <p className="text-xs text-white/40">Super Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.07]">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all mb-1"
        >
          <LayoutDashboard className="w-4 h-4" />
          Ir al Dashboard
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/50 hover:bg-white/[0.06] hover:text-white/80 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
