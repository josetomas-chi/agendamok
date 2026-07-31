"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, Users, CreditCard, BarChart3, Settings, LogOut, Shield, Menu, X } from "lucide-react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Negocios", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/subscriptions", label: "Suscripciones", icon: CreditCard },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.16 0.02 260)" }}>
      <div className="h-16 flex items-center px-5 border-b border-white/[0.07] justify-between">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Agenda<span className="text-sky-400">Mok</span></span>
            <p className="text-xs text-white/40">Super Admin</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
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
          onClick={onClose}
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
    </div>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar — siempre visible */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0 h-screen border-r border-white/[0.07]">
        <SidebarContent />
      </aside>

      {/* Mobile topbar con hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 border-b border-white/[0.07]" style={{ background: "oklch(0.16 0.02 260)" }}>
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}>
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Agenda<span className="text-sky-400">Mok</span></span>
          <span className="text-xs text-white/40">Super Admin</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 shadow-2xl">
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </>
      )}

    </>
  )
}
