"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || "Error al crear la cuenta")
      setLoading(false)
      return
    }

    router.push("/login?registered=1")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#52525a] px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white tracking-tight">
            Agenda<span className="text-sky-400">Mok</span>
          </Link>
          <p className="mt-2 text-sm text-white/40">Crea tu cuenta gratis</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-6 shadow-xl shadow-black/20">
          <h1 className="text-lg font-semibold text-white mb-1">Crear cuenta</h1>
          <p className="text-sm text-white/40 mb-6">30 días gratis · Sin tarjeta al inicio</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Nombre completo</label>
              <input
                name="name" required placeholder="Juan García"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/15 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Email</label>
              <input
                name="email" type="email" required placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/15 transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Contraseña</label>
              <input
                name="password" type="password" minLength={8} required placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/15 transition-all text-sm"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? "Creando cuenta..." : <>Crear cuenta gratis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
            <p className="text-xs text-center text-white/20">
              Al registrarte aceptas nuestros{" "}
              <Link href="/terms" className="text-white/40 hover:text-white/60 underline">Términos de servicio</Link>
            </p>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-white/30">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-sky-400 hover:text-sky-300 transition-colors">Ingresar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
