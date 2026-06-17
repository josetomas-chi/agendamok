"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CardSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 4000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border p-10 max-w-md w-full text-center space-y-5 shadow-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">¡Tarjeta registrada!</h1>
          <p className="text-muted-foreground mt-2">
            Tu método de pago quedó guardado. No se realizará ningún cobro hasta que termine tu periodo de prueba.
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
          El cobro se realizará automáticamente al vencer los 3 meses del plan Inicial ($4.990/mes).
          Puedes cancelar en cualquier momento desde Configuración.
        </div>
        <Button className="w-full" onClick={() => router.push("/dashboard")}>
          Ir al panel
        </Button>
        <p className="text-xs text-muted-foreground">Redirigiendo automáticamente...</p>
      </div>
    </div>
  )
}
