"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Lock, CheckCircle } from "lucide-react"

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    setLoading(true)
    const r = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    const d = await r.json()
    if (r.ok) {
      setDone(true)
      // Pequeña pausa para que el usuario lea el mensaje, luego al login
      setTimeout(() => router.push("/login?invited=1"), 3000)
    } else {
      toast.error(d.error || "Error al activar cuenta")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {done ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Lock className="w-6 h-6 text-primary" />}
          </div>
          <CardTitle>{done ? "Cuenta activada" : "Crea tu contraseña"}</CardTitle>
          <CardDescription>
            {done
              ? "Tu cuenta está lista. Ahora puedes iniciar sesión en AgendaMok."
              : "Bienvenido a AgendaMok. Elige una contraseña para activar tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesión...</p>
              <Button className="w-full" onClick={() => router.push("/login?invited=1")}>
                Ir ahora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? "Activando cuenta..." : "Activar cuenta"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
