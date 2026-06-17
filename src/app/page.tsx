import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Calendar, Users, CreditCard, Bell, BarChart3, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  { icon: Calendar, title: "Calendario inteligente", desc: "Vista semanal/mensual con drag & drop para reagendar turnos al instante." },
  { icon: Globe, title: "Booking 24/7", desc: "Tus clientes reservan desde cualquier dispositivo, a cualquier hora." },
  { icon: Users, title: "Gestión de staff", desc: "Horarios, comisiones, días libres y acceso diferenciado por rol." },
  { icon: Bell, title: "Recordatorios automáticos", desc: "Email y WhatsApp automáticos antes de cada turno para reducir ausentismo." },
  { icon: CreditCard, title: "Cobros online", desc: "Acepta pagos y depósitos online con Stripe. Genera facturas PDF." },
  { icon: BarChart3, title: "Reportes y analytics", desc: "Ingresos, ocupación, comisiones y top clientes en tiempo real." },
]

const plans = [
  {
    name: "Free",
    price: "0",
    description: "Para empezar sin riesgo",
    features: ["1 sede", "Hasta 2 profesionales", "50 turnos/mes", "Booking online", "Email básico"],
    cta: "Empezar gratis",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "9.900",
    description: "Para negocios en crecimiento",
    features: ["Sedes ilimitadas", "Profesionales ilimitados", "Turnos ilimitados", "WhatsApp + email", "Pagos online", "Reportes completos", "Fidelización"],
    cta: "Probar 14 días gratis",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "29.900",
    description: "Para cadenas y franquicias",
    features: ["Todo lo de Pro", "Multi-sede consolidado", "API access", "Soporte prioritario", "Onboarding dedicado", "SLA garantizado"],
    cta: "Contactar ventas",
    href: "/contact",
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-indigo-600">Agenda Pro</Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Funciones</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Precios</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Ingresar</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ingresar
            </Link>
            <Link href="/register" className={buttonVariants({ size: "sm" })}>
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge variant="secondary" className="mb-4">Nuevo: Recordatorios por WhatsApp</Badge>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Gestión de turnos{" "}
              <span className="text-indigo-600">para cualquier negocio</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10">
              Peluquerías, centros médicos, gimnasios, estudios legales y más.
              Tus clientes reservan online 24/7 y tú gestionas todo desde un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className={buttonVariants({ size: "lg" })}>
                Empezar gratis — sin tarjeta
              </Link>
              <Link href="/book/demo" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Ver demo en vivo
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Más de 5.000 negocios ya usan Agenda Pro
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Todo lo que tu negocio necesita</h2>
              <p className="mt-4 text-muted-foreground">Una plataforma completa para gestionar turnos, clientes y pagos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Planes y precios</h2>
              <p className="mt-4 text-muted-foreground">Elige el plan que mejor se adapte a tu negocio. Cancela cuando quieras.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={plan.highlight ? "border-indigo-600 shadow-lg scale-105" : ""}
                >
                  <CardHeader>
                    {plan.highlight && (
                      <Badge className="w-fit mb-2 bg-indigo-600">Más popular</Badge>
                    )}
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">
                        {plan.price === "0" ? "Gratis" : `$${plan.price}`}
                      </span>
                      {plan.price !== "0" && (
                        <span className="text-muted-foreground text-sm"> /mes</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.href}
                      className={cn(
                        buttonVariants({ variant: plan.highlight ? "default" : "outline" }),
                        "w-full justify-center"
                      )}
                    >
                      {plan.cta}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-indigo-600">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Empieza a recibir turnos online hoy mismo
            </h2>
            <p className="text-indigo-100 mb-8">
              Configura tu negocio en menos de 5 minutos. Sin tarjeta de crédito.
            </p>
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              Crear cuenta gratuita
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 Agenda Pro. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link href="/terms" className="hover:text-foreground">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
