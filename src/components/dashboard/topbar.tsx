"use client"

import { useEffect, useState, useRef } from "react"
import { Camera, Menu, Search } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

type Business = { id: string; name: string; logo: string | null }

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(async d => {
      const r = await fetch(`/api/businesses/${d.businessId}`)
      const data = await r.json()
      setBusiness({ id: data.business.id, name: data.business.name, logo: data.business.logo })
    })
  }, [])

  async function handleLogoUpload(file: File) {
    if (!business) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const up = await fetch("/api/upload", { method: "POST", body: fd })
    if (!up.ok) { toast.error("Error al subir imagen"); setUploading(false); return }
    const { url } = await up.json()
    await fetch(`/api/businesses/${business.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: url }),
    })
    setBusiness(b => b ? { ...b, logo: url } : b)
    toast.success("Logo actualizado")
    setUploading(false)
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "#232326", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all mr-1"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Business logo + name */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-all hover:ring-2 hover:ring-sky-400/40"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            title="Cambiar logo del negocio"
          >
            {business?.logo ? (
              <Image src={business.logo} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm font-bold text-white/50">
                {business?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none tracking-tight">
            {business?.name ?? <span className="skeleton w-28 h-3.5 rounded inline-block" />}
          </p>
          <p className="text-[11px] text-white/35 leading-none mt-1">
            {uploading ? "Subiendo logo..." : "Tu negocio"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Cmd+K search hint */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg border border-white/8 bg-white/[0.04] text-white/25 hover:text-white/50 hover:border-white/15 transition-all text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buscar</span>
          <kbd className="ml-1 text-[10px] bg-white/8 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        {/* AgendaMok brand */}
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
            Agenda<span style={{ color: "#38bdf8" }}>Mok</span>
          </span>
        </div>
      </div>
    </header>
  )
}
