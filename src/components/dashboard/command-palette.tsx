"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  Calendar, Users, Scissors, BarChart2, Settings, HelpCircle,
  CreditCard, Megaphone, MapPin, FileText, Star, Search,
} from "lucide-react"

const NAVIGATION = [
  { label: "Dashboard", href: "/dashboard", icon: Calendar },
  { label: "Turnos", href: "/dashboard/appointments", icon: Calendar },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Servicios", href: "/dashboard/services", icon: Scissors },
  { label: "Staff", href: "/dashboard/staff", icon: Users },
  { label: "Reportes", href: "/dashboard/reports", icon: BarChart2 },
  { label: "Pagos", href: "/dashboard/payments", icon: CreditCard },
  { label: "Marketing", href: "/dashboard/marketing", icon: Megaphone },
  { label: "Cotizaciones", href: "/dashboard/quotes", icon: FileText },
  { label: "Encuestas", href: "/dashboard/surveys", icon: Star },
  { label: "Ubicaciones", href: "/dashboard/locations", icon: MapPin },
  { label: "Configuración", href: "/dashboard/settings", icon: Settings },
  { label: "Ayuda", href: "/dashboard/help", icon: HelpCircle },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
    setSearch("")
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 bg-[#28282c] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input-wrapper]]:border-0">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar páginas y acciones..."
              autoFocus
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/25"
            />
            <kbd className="text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-white/30">
              Sin resultados para &ldquo;{search}&rdquo;
            </Command.Empty>

            <Command.Group heading="Navegar" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-white/25 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest">
              {NAVIGATION.map(item => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => navigate(item.href)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-white/70 data-[selected=true]:bg-sky-500/15 data-[selected=true]:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4 text-white/30" />
                    {item.label}
                    <span className="ml-auto text-[11px] text-white/20">{item.href}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>
        </Command>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-white/8 flex items-center gap-3 text-[11px] text-white/20">
          <span><kbd className="bg-white/5 px-1 rounded">↑↓</kbd> navegar</span>
          <span><kbd className="bg-white/5 px-1 rounded">↵</kbd> abrir</span>
          <span><kbd className="bg-white/5 px-1 rounded">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
