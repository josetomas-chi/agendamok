"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

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

    router.push(isNew ? "/onboarding" : isInvited ? "/onboarding/setup" : "/dashboard")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="tu@email.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">AgendaMok</Link>
          <p className="mt-1 text-muted-foreground text-sm">Ingresa a tu cuenta</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tu email y contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded" />}>
              <LoginForm />
            </Suspense>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">¿No tienes cuenta? </span>
              <Link href="/register" className="text-indigo-600 hover:underline">Registrarte gratis</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
