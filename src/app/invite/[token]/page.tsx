"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react"
import { signIn } from "next-auth/react"

type InviteInfo = {
  businessName: string
  email: string
  hasPassword: boolean
  alreadyAccepted: boolean
}

function InviteContent() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setInfo(d) })
      .catch(() => setError("Error al cargar la invitación"))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: info?.hasPassword ? undefined : password }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || "Error"); setSaving(false); return }

      const result = await signIn("credentials", { email: info?.email, password: info?.hasPassword ? undefined : password, redirect: false })
      if (result?.ok) router.push("/dashboard")
      else router.push("/login")
    } catch {
      setError("Error al aceptar la invitación")
      setSaving(false)
    }
  }

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/50 transition-colors text-sm"

  if (loading) return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error && !info) return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-white text-lg font-semibold">Invitación inválida</p>
        <p className="text-white/40 text-sm">{error}</p>
      </div>
    </div>
  )

  if (info?.alreadyAccepted) return (
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-sky-400 mx-auto" />
        <p className="text-white text-lg font-semibold">Invitación ya aceptada</p>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition-colors">
          Ir al dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#1c1c1e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <span className="font-bold text-2xl tracking-tight">Agenda<span className="text-sky-400">Mok</span></span>
          <p className="text-white/50 text-sm mt-2">Te invitaron a unirte como <strong className="text-white">Recepcionista</strong> en</p>
          <p className="text-sky-400 font-semibold text-lg">{info?.businessName}</p>
        </div>

        <div className="bg-[#2c2c30] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 uppercase tracking-wider">Email</label>
            <div className="px-4 py-3 bg-white/5 rounded-xl text-sm text-white/60 border border-white/5">{info?.email}</div>
          </div>

          {!info?.hasPassword && (
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 uppercase tracking-wider">Crea tu contraseña</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  className={inputCls}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleAccept}
            disabled={saving || (!info?.hasPassword && password.length < 8)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors font-semibold text-sm disabled:opacity-40"
          >
            <Lock className="w-4 h-4" />
            {saving ? "Procesando..." : "Aceptar invitación"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#1c1c1e]" />}><InviteContent /></Suspense>
}
