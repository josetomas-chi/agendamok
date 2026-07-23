import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

export const metadata: Metadata = {
  title: { default: "AgendaMok — Reservas online para tu negocio", template: "%s | AgendaMok" },
  description: "Gestión de turnos y reservas online para negocios de servicios. Booking 24/7, calendario inteligente, recordatorios automáticos y pagos integrados. 30 días gratis.",
  keywords: ["agenda online", "reservas online", "turnos online", "software peluquería", "software clínica", "booking Chile", "AgendaMok"],
  authors: [{ name: "AgendaMok" }],
  creator: "AgendaMok",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://agendamok.cl"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://agendamok.cl",
    siteName: "AgendaMok",
    title: "AgendaMok — Reservas online para tu negocio",
    description: "Gestión de turnos y reservas online para negocios de servicios. Booking 24/7, calendario inteligente y pagos integrados. 30 días gratis, sin tarjeta.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AgendaMok — Plataforma de reservas online" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgendaMok — Reservas online para tu negocio",
    description: "Gestión de turnos y reservas online para negocios de servicios. 30 días gratis.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/mok-icon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AgendaMok" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
