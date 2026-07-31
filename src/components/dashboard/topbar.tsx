"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, Menu, Search, ChevronDown, Check, Building2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { useRouter } from "next/navigation"

type BusinessOption = { id: string; name: string; logo: string | null; businessType: string }

export function TopBar({
  onMenuClick, isSports, businessId, businessName, businessLogo, allBusinesses, activeBusinessId,
}: {
  onMenuClick?: () => void
  isSports?: boolean
  businessId: string
  businessName: string
  businessLogo: string | null
  allBusinesses?: BusinessOption[]
  activeBusinessId?: string
}) {
  const [logo, setLogo] = useState<string | null>(businessLogo)
  useEffect(() => { setLogo(businessLogo) }, [businessLogo])
  const [uploading, setUploading] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const hasMultiple = (allBusinesses?.length ?? 0) > 1

  async function handleLogoUpload(file: File) {
    if (!businessId) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const up = await fetch("/api/upload", { method: "POST", body: fd })
    if (!up.ok) { toast.error("Error al subir imagen"); setUploading(false); return }
    const { url } = await up.json()
    await fetch(`/api/businesses/${businessId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: url }),
    })
    setLogo(url)
    toast.success("Logo actualizado")
    setUploading(false)
  }

  async function handleSwitch(id: string) {
    if (id === activeBusinessId) { setSwitcherOpen(false); return }
    setSwitching(true)
    await fetch("/api/auth/switch-business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: id }),
    })
    setSwitcherOpen(false)
    router.refresh()
    setSwitching(false)
  }

  const BusinessInfo = ({ dark }: { dark: boolean }) => (
    <div className="flex items-center gap-3 relative">
      <div className="relative group">
        <button
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
          className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-all ${dark ? "hover:ring-2 hover:ring-sky-400/40" : ""}`}
          style={dark
            ? { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }
            : { background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}
          title="Cambiar logo">
          {logo ? (
            <Image src={logo} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
          ) : (
            <span className={`text-sm font-bold ${dark ? "text-white/50" : ""}`} style={dark ? {} : { color: "#C9A84C" }}>
              {businessName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl ${dark ? "bg-black/50" : ""}`}
            style={dark ? {} : { background: "rgba(13,27,42,0.5)" }}>
            <Camera className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
      </div>

      {hasMultiple ? (
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-2 transition-all ${dark
            ? "hover:bg-white/[0.06] text-white"
            : "hover:bg-black/5"}`}
          disabled={switching}
        >
          <div>
            <p className={`text-sm font-semibold leading-none tracking-tight ${dark ? "text-white" : "text-[#0d1b2a] font-black uppercase"}`}>
              {businessName}
            </p>
            <p className={`text-[11px] leading-none mt-1 ${dark ? "text-white/55" : "font-semibold uppercase tracking-widest"}`}
              style={dark ? {} : { color: "#C9A84C" }}>
              {uploading ? "Subiendo..." : switching ? "Cambiando..." : "Tu negocio"}
            </p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform mt-0.5 ${switcherOpen ? "rotate-180" : ""} ${dark ? "text-white/40" : "text-gray-400"}`} />
        </button>
      ) : (
        <div>
          <p className={`text-sm font-semibold leading-none tracking-tight ${dark ? "text-white" : "text-[#0d1b2a] font-black uppercase"}`}>
            {businessName}
          </p>
          <p className={`text-[11px] leading-none mt-1 ${dark ? "text-white/55" : "font-semibold uppercase tracking-widest"}`}
            style={dark ? {} : { color: "#C9A84C" }}>
            {uploading ? "Subiendo..." : "Tu negocio"}
          </p>
        </div>
      )}

      {/* Dropdown */}
      {switcherOpen && allBusinesses && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
          <div className={`absolute top-12 left-0 z-50 w-64 rounded-xl shadow-xl border overflow-hidden ${dark
            ? "bg-[#2c2c30] border-white/10"
            : "bg-white border-gray-200"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 pt-3 pb-1.5 ${dark ? "text-white/30" : "text-gray-400"}`}>
              Mis negocios
            </p>
            {allBusinesses.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSwitch(b.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${dark
                  ? "hover:bg-white/[0.06]"
                  : "hover:bg-gray-50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dark
                  ? "bg-white/[0.08] border border-white/10"
                  : "bg-gray-100 border border-gray-200"}`}>
                  {b.logo ? (
                    <Image src={b.logo} alt={b.name} width={32} height={32} className="object-cover w-full h-full rounded-lg" />
                  ) : (
                    <Building2 className={`w-4 h-4 ${dark ? "text-white/40" : "text-gray-400"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${dark ? "text-white" : "text-gray-800"}`}>{b.name}</p>
                  <p className={`text-[11px] ${dark ? "text-white/35" : "text-gray-400"}`}>
                    {b.businessType === "SPORTS_CLUB" ? "Club deportivo" : "Negocio"}
                  </p>
                </div>
                {b.id === activeBusinessId && (
                  <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  if (isSports) {
    const GOLD = "#C9A84C"
    return (
      <header className="h-14 flex items-center justify-between px-6 flex-shrink-0"
        style={{ background: "#ffffff", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <button onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg transition-all mr-1"
          style={{ color: "#0d1b2a" }}>
          <Menu className="w-5 h-5" />
        </button>
        <BusinessInfo dark={false} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all"
            style={{ border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.06)", color: "rgba(13,27,42,0.4)" }}>
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
            <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(201,168,76,0.12)" }}>⌘K</kbd>
          </button>
          <div className="hidden md:flex items-baseline gap-1">
            <span className="text-[13px] font-black tracking-tight uppercase" style={{ color: "#0d1b2a" }}>AgendaMok</span>
            <span className="text-[11px] font-black tracking-widest uppercase" style={{ color: GOLD }}>Sports</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "#232326", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all mr-1">
        <Menu className="w-5 h-5" />
      </button>
      <BusinessInfo dark={true} />
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border border-white/8 bg-white/[0.04] text-white/25 hover:text-white/50 hover:border-white/15 transition-all text-xs">
          <Search className="w-3.5 h-3.5" />
          <span>Buscar</span>
          <kbd className="ml-1 text-[10px] bg-white/8 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
            Agenda<span style={{ color: "#38bdf8" }}>Mok</span>
          </span>
        </div>
      </div>
    </header>
  )
}
