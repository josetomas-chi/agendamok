"use client"

import { useEffect, useState, useRef } from "react"
import { Camera } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

type Business = { id: string; name: string; logo: string | null }

export function TopBar() {
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
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-[#3a3a3c]/60 backdrop-blur-sm flex-shrink-0">
      {/* Business logo + name */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-9 h-9 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center bg-white/10 hover:bg-white/15 transition-colors"
            title="Cambiar logo del negocio"
          >
            {business?.logo ? (
              <Image src={business.logo} alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              <span className="text-sm font-bold text-white/60">
                {business?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-none">
            {business?.name ?? <span className="w-28 h-3.5 bg-white/10 rounded animate-pulse inline-block" />}
          </p>
          <p className="text-[11px] text-white/40 leading-none mt-0.5">
            {uploading ? "Subiendo logo..." : "Tu negocio"}
          </p>
        </div>
      </div>

      {/* AgendaMok brand */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-white/30">Potenciado por</span>
        <span className="text-xs font-bold text-white/60">Agenda<span className="text-sky-400">Mok</span></span>
      </div>
    </header>
  )
}
