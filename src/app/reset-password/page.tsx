"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    if (!token) { setValidating(false); return }
    fetch(`/api/auth/validate-reset-token?token=${token}`)
      .then(r => r.json())
      .then(d => { setTokenValid(d.valid); setValidating(false) })
      .catch(() => setValidating(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setErrorMsg("Las contraseñas no coinciden"); return }
    if (password.length < 8) { setErrorMsg("Mínimo 8 caracteres"); return }
    setStatus("loading")
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    if (r.ok) {
      setStatus("success")
    } else {
      const d = await r.json().catch(() => ({}))
      setErrorMsg(d.error || "Error al restablecer")
      setStatus("error")
    }
  }

  if (validating) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1e" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>Verificando enlace…</p>
    </div>
  )

  if (!token || !tokenValid) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1e" }}>
      <div className="text-center max-w-sm px-4">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-white mb-2">Enlace inválido o expirado</h1>
        <p style={{ color: "rgba(255,255,255,0.4)" }}>Este enlace ya fue usado o expiró. Solicita un nuevo correo de restablecimiento.</p>
      </div>
    </div>
  )

  if (status === "success") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1e" }}>
      <div className="text-center max-w-sm px-4">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-white mb-2">Contraseña actualizada</h1>
        <p style={{ color: "rgba(255,255,255,0.4)" }} className="mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <button onClick={() => router.push("/login")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "#fff" }}>
          Ir al inicio de sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#1a1a1e" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-black" style={{ color: "#38bdf8" }}>Agenda<span style={{ color: "#fff" }}>Mok</span></span>
          <h1 className="text-xl font-bold text-white mt-4 mb-1">Nueva contraseña</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Elige una contraseña segura de mínimo 8 caracteres</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
              className="mt-1 w-full h-10 rounded-xl px-3 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setErrorMsg("") }} required
              className="mt-1 w-full h-10 rounded-xl px-3 text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
          </div>
          {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}
          <button type="submit" disabled={status === "loading"}
            className="w-full h-10 rounded-xl text-sm font-semibold mt-2 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "#fff" }}>
            {status === "loading" ? "Guardando…" : "Establecer contraseña"}
          </button>
        </form>
      </div>
    </div>
  )
}
