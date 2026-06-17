import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings, Mail, CreditCard, Globe } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") redirect("/dashboard")

  const items = [
    {
      icon: Mail,
      title: "Email (Resend)",
      desc: "Configurado",
      detail: "Las confirmaciones de turnos y los links de invitación se envían automáticamente.",
      status: "active",
    },
    {
      icon: CreditCard,
      title: "Pagos (Flow)",
      desc: "Modo sandbox",
      detail: "Las suscripciones se procesan a través de Flow.cl. En producción cambia FLOW_API_URL a https://www.flow.cl/api.",
      status: "sandbox",
    },
    {
      icon: Globe,
      title: "Widget embebible",
      desc: "Activo",
      detail: "El script /widget.js está disponible públicamente para que los clientes lo integren en sus webs.",
      status: "active",
    },
  ]

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    sandbox: "bg-yellow-100 text-yellow-700",
    inactive: "bg-gray-100 text-gray-500",
  }
  const statusLabel: Record<string, string> = {
    active: "Activo",
    sandbox: "Sandbox",
    inactive: "Inactivo",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion de la plataforma</h1>
        <p className="text-muted-foreground text-sm mt-1">Estado de las integraciones y servicios globales</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map(({ icon: Icon, title, desc, detail, status }) => (
          <Card key={title}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status]}`}>
                      {statusLabel[status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{detail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variables de entorno</CardTitle>
          <CardDescription>Para cambiar configuraciones edita el archivo .env y reinicia el servidor.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-xs">
            {[
              { key: "NEXTAUTH_URL", hint: "URL base de la app" },
              { key: "DATABASE_URL", hint: "Conexion a PostgreSQL" },
              { key: "RESEND_API_KEY", hint: "API key de Resend para emails" },
              { key: "FLOW_API_KEY", hint: "API key de Flow.cl" },
              { key: "FLOW_API_URL", hint: "sandbox.flow.cl en dev / www.flow.cl en produccion" },
            ].map(({ key, hint }) => (
              <div key={key} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-indigo-600 font-semibold w-48 flex-shrink-0">{key}</span>
                <span className="text-muted-foreground">{hint}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
