"use client"

import { useRef } from "react"

const businesses = [
  { name: "Kinesiólogo",       photo: "photo-1571019613454-1cb2f99b2d8b" },
  { name: "Peluquería",        photo: "photo-1522337360788-8b13dee7a37e" },
  { name: "Barbería",          photo: "photo-1503951914875-452162b0f3f1" },
  { name: "Nutricionista",     photo: "photo-1490645935967-10de6ba17061" },
  { name: "Masajes",           photo: "photo-1544161515-4ab6ce6db874" },
  { name: "Acupuntura",        photo: "photo-1512290923902-8a9f81dc236c" },
  { name: "Psicólogo",         photo: "photo-1573497019940-1c28c88b4f3e" },
  { name: "Tatuador",          photo: "photo-1598371839696-5c5bb00bdc28" },
  { name: "Fotógrafo",         photo: "photo-1542038784456-1ea8e935640e" },
  { name: "Entrenador Personal", photo: "photo-1571019614242-c5c5dee9f50b" },
  { name: "Manicure & Pedicure", photo: "photo-1604654894610-df63bc536371" },
  { name: "Dentista",          photo: "photo-1606811971618-4486d14f3f99" },
  { name: "Médico",            photo: "photo-1559839734-2b71ea197ec2" },
  { name: "Veterinario",       photo: "photo-1581888227599-779811939961" },
  { name: "Spa",               photo: "photo-1540555700478-4be289fbecef" },
  { name: "Centro Estético",   photo: "photo-1570172619644-dfd03ed5d881" },
  { name: "Abogado",           photo: "photo-1589829545856-d10d557cf95f" },
  { name: "Notaría",           photo: "photo-1454165804606-c3d57bc86b40" },
  { name: "Coach",             photo: "photo-1522202176988-66273c2fd55f" },
  { name: "Yoga",              photo: "photo-1506126613408-eca07ce68773" },
  { name: "Taller Mecánico",  photo: "photo-1537984822441-cff5b2880159" },
]

const row1 = businesses.slice(0, 10)
const row2 = businesses.slice(10)

function CarouselCard({ name, photo }: { name: string; photo: string }) {
  return (
    <div
      className="flex-shrink-0 relative overflow-hidden"
      style={{
        width: 180,
        height: 240,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Photo */}
      <img
        src={`https://images.unsplash.com/${photo}?w=360&h=480&fit=crop&crop=faces,center&auto=format&q=75`}
        alt={name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)" }}
      />
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 inset-x-0"
        style={{ height: 3, background: "linear-gradient(90deg, #0ea5e9, #62CBF2)" }}
      />
      {/* Label */}
      <div className="absolute bottom-0 inset-x-0 px-3 pb-4 pt-6">
        <p
          className="text-white text-center font-bold leading-tight"
          style={{ fontSize: 13, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {name}
        </p>
      </div>
    </div>
  )
}

function CarouselRow({ items, direction }: { items: typeof businesses; direction: "left" | "right" }) {
  const trackRef = useRef<HTMLDivElement>(null)
  // Duplicate for infinite loop
  const doubled = [...items, ...items, ...items]

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = "paused" }}
      onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = "running" }}
    >
      <div
        ref={trackRef}
        className="flex gap-4"
        style={{
          width: "max-content",
          animation: `scroll-${direction} ${items.length * 4}s linear infinite`,
        }}
      >
        {doubled.map((b, i) => (
          <CarouselCard key={`${b.name}-${i}`} name={b.name} photo={b.photo} />
        ))}
      </div>
    </div>
  )
}

export function BusinessCarousel() {
  return (
    <section className="py-20 overflow-hidden bg-background">
      <style>{`
        @keyframes scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        @keyframes scroll-right {
          0%   { transform: translateX(calc(-100% / 3)); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-12 px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          Para cualquier negocio de servicios
        </h2>
        <p className="text-white/45 text-base">Si tienes citas, AgendaMok es para ti</p>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        <CarouselRow items={row1} direction="left" />
        <CarouselRow items={row2} direction="right" />
      </div>

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32" style={{ background: "linear-gradient(to right, #111318, transparent)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32" style={{ background: "linear-gradient(to left, #111318, transparent)" }} />
    </section>
  )
}
