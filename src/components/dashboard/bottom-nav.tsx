"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, Users, BarChart3, Settings } from "lucide-react"

const items = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/appointments", label: "Turnos", icon: Calendar },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Config", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8"
      style={{ background: "#232326", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-14">
        {items.map(item => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
            >
              <Icon className={`w-5 h-5 transition-colors ${active ? "text-sky-400" : "text-white/30"}`} />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-sky-400" : "text-white/25"}`}>
                {item.label}
              </span>
              {active && <div className="absolute top-0 w-8 h-0.5 bg-sky-400 rounded-b" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
