"use client"

import { useState, useRef } from "react"
import { Camera, Menu, Search } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

export function TopBar({
  onMenuClick, isSports, businessId, businessName, businessLogo,
}: {
  onMenuClick?: () => void
  isSports?: boolean
  businessId: string
  businessName: string
  businessLogo: string | null
}) {
  const [logo, setLogo] = useState<string | null>(businessLogo)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

        <div className="flex items-center gap-3">
          <div className="relative group">
            <button onClick={() => inputRef.current?.click()}
              className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-all"
              style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)" }}
              title="Cambiar logo">
              {logo ? (
                <Image src={logo} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <span className="text-sm font-bold" style={{ color: GOLD }}>
                  {businessName?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl" style={{ background: "rgba(13,27,42,0.5)" }}>
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide leading-none" style={{ color: "#0d1b2a" }}>
              {businessName}
            </p>
            <p className="text-[11px] leading-none mt-1 font-semibold uppercase tracking-widest" style={{ color: GOLD }}>
              {uploading ? "Subiendo logo..." : "Sports Club"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
            className="hidden md:flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all"
            style={{ border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.06)", color: "rgba(13,27,42,0.4)" }}>
            <Search className="w-3.5 h-3.5" />
            <span>Buscar</span>
            <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(201,168,76,0.12)" }}>⌘K</kbd>
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-[13px] font-black tracking-tight uppercase" style={{ color: "#0d1b2a" }}>AgendaMok</span>
            <span className="text-[11px] font-black tracking-widest uppercase" style={{ color: GOLD }}>Sports</span>
          </div>
        </div>
      </header>
    )
  }

  // ── General topbar ───────────────────────────────────────────────────────────
  return (
    <header className="h-14 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "#232326", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all mr-1">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3">
        <div className="relative group">
          <button onClick={() => inputRef.current?.click()}
            className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center transition-all hover:ring-2 hover:ring-sky-400/40"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            title="Cambiar logo del negocio">
            {logo ? (
              <Image src={logo} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm font-bold text-white/50">{businessName?.[0]?.toUpperCase() ?? "?"}</span>
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
            {businessName}
          </p>
          <p className="text-[11px] text-white/35 leading-none mt-1">
            {uploading ? "Subiendo logo..." : "Tu negocio"}
          </p>
        </div>
      </div>
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
