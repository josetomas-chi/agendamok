"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("¡Cuenta creada! Ingresa con tus datos")
    }
    if (searchParams.get("invited") === "1") {
      toast.success("¡Contraseña creada! Ahora ingresa para configurar tu negocio")
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const isNew = searchParams.get("registered") === "1"
    const isInvited = searchParams.get("invited") === "1"

    const res = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    })

    if (res?.error) {
      toast.error("Email o contraseña incorrectos")
      setLoading(false)
      return
    }

    const sessionRes = await fetch("/api/auth/session")
    const session = await sessionRes.json()
    const role = session?.user?.role

    if (role === "SUPER_ADMIN") {
      router.push("/admin")
    } else {
      router.push(isNew ? "/onboarding" : isInvited ? "/onboarding/setup" : "/dashboard")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm text-white/60">Email</label>
        <input
          name="email" type="email" required
          placeholder="tu@email.com"
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/15 transition-all text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-white/60">Contraseña</label>
        <input
          name="password" type="password" required
          placeholder="••••••••"
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/15 transition-all text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 group mt-2"
      >
        {loading ? "Ingresando..." : <>Ingresar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#52525a] px-4">
      {/* Glow de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white tracking-tight">
            Agenda<span className="text-sky-400">Mok</span>
          </Link>
          <p className="mt-2 text-sm text-white/40">Ingresa a tu cuenta</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-6 shadow-xl shadow-black/20">
          <h1 className="text-lg font-semibold text-white mb-1">Iniciar sesión</h1>
          <p className="text-sm text-white/40 mb-6">Bienvenido de vuelta</p>

          <Suspense fallback={<div className="h-32 animate-pulse bg-white/5 rounded-xl" />}>
            <LoginForm />
          </Suspense>

          <div className="mt-5 text-center text-sm">
            <span className="text-white/30">¿No tienes cuenta? </span>
            <Link href="/register" className="text-sky-400 hover:text-sky-300 transition-colors">Registrarte gratis</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
