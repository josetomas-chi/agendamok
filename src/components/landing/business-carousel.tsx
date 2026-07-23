"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const businesses = [
  { name: "Peluquería",          photo: "photo-1522337360788-8b13dee7a37e" },
  { name: "Barbería",            photo: "photo-1503951914875-452162b0f3f1" },
  { name: "Kinesiólogo",         photo: "photo-1571019613454-1cb2f99b2d8b" },
  { name: "Nutricionista",       photo: "photo-1490645935967-10de6ba17061" },
  { name: "Masajes",             photo: "photo-1544161515-4ab6ce6db874" },
  { name: "Psicólogo",           photo: "photo-1573497019940-1c28c88b4f3e" },
  { name: "Centro Estético",     photo: "photo-1570172619644-dfd03ed5d881" },
  { name: "Dentista",            photo: "photo-1606811971618-4486d14f3f99" },
  { name: "Médico",              photo: "photo-1559839734-2b71ea197ec2" },
  { name: "Spa",                 photo: "photo-1540555700478-4be289fbecef" },
  { name: "Tatuador",            photo: "photo-1598371839696-5c5bb00bdc28" },
  { name: "Entrenador Personal", photo: "photo-1571019614242-c5c5dee9f50b" },
  { name: "Veterinario",         photo: "photo-1581888227599-779811939961" },
  { name: "Yoga",                photo: "photo-1506126613408-eca07ce68773" },
  { name: "Coach",               photo: "photo-1522202176988-66273c2fd55f" },
  { name: "Abogado",             photo: "photo-1589829545856-d10d557cf95f" },
  { name: "Manicure & Pedicure", photo: "photo-1604654894610-df63bc536371" },
  { name: "Fotógrafo",           photo: "photo-1542038784456-1ea8e935640e" },
  { name: "Acupuntura",          photo: "photo-1512290923902-8a9f81dc236c" },
  { name: "Taller Mecánico",     photo: "photo-1487754180451-c456f719a1fc" },
]

const CARD_W = 280
const CARD_H = 380
const GAP = 20
const VISIBLE = 3 // cards fully visible + partial sides

export function BusinessCarousel() {
  const [index, setIndex] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const total = businesses.length

  const prev = useCallback(() => setIndex(i => (i - 1 + total) % total), [total])
  const next = useCallback(() => setIndex(i => (i + 1) % total), [total])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(next, 4000)
  }, [next])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const handlePrev = () => { prev(); resetTimer() }
  const handleNext = () => { next(); resetTimer() }
  const handleDot  = (i: number) => { setIndex(i); resetTimer() }

  // Drag / swipe
  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true)
    setDragStart(e.clientX)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    const dx = dragStart - e.clientX
    if (Math.abs(dx) > 40) dx > 0 ? handleNext() : handlePrev()
  }

  // How many cards to show (responsive approximation handled via maxWidth)
  const visibleCount = VISIBLE
  const offset = -(index * (CARD_W + GAP)) + ((visibleCount - 1) / 2) * (CARD_W + GAP)

  return (
    <section className="relative py-24 overflow-hidden bg-white">
      <style>{`
        .biz-card {
          transition: transform 0.5s cubic-bezier(0.32,0.72,0,1),
                      opacity  0.5s cubic-bezier(0.32,0.72,0,1),
                      box-shadow 0.3s ease;
        }
        .biz-track {
          transition: transform 0.5s cubic-bezier(0.32,0.72,0,1);
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-14 px-4">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          Para cualquier negocio de servicios
        </h2>
        <p className="text-gray-400 text-base">Si tienes citas, AgendaMok es para ti</p>
      </div>

      {/* Carousel viewport */}
      <div
        className="relative mx-auto select-none"
        style={{ maxWidth: visibleCount * (CARD_W + GAP) + 120, overflow: "hidden" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Track */}
        <div
          className="biz-track flex"
          style={{
            gap: GAP,
            transform: `translateX(calc(50% + ${offset}px - ${(CARD_W + GAP) / 2}px))`,
          }}
        >
          {businesses.map((b, i) => {
            const dist = Math.abs(
              ((i - index + total) % total + total) % total <= total / 2
                ? ((i - index + total) % total)
                : -((index - i + total) % total)
            )
            const isActive = i === index
            const scale = isActive ? 1 : dist === 1 ? 0.92 : 0.84
            const opacity = isActive ? 1 : dist === 1 ? 0.65 : 0.35

            return (
              <div
                key={b.name}
                className="biz-card flex-shrink-0 relative overflow-hidden cursor-pointer"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  borderRadius: 20,
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  opacity,
                  boxShadow: isActive
                    ? "0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)"
                    : "0 4px 16px rgba(0,0,0,0.06)",
                }}
                onClick={() => { if (!dragging) handleDot(i) }}
              >
                <img
                  src={`https://images.unsplash.com/${b.photo}?w=560&h=760&fit=crop&crop=faces,center&auto=format&q=80`}
                  alt={b.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
                {/* Gradient */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.72) 100%)" }}
                />
                {/* Label */}
                <div className="absolute bottom-0 inset-x-0 px-5 pb-5">
                  <p className="text-white font-semibold text-base tracking-tight" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
                    {b.name}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24" style={{ background: "linear-gradient(to right, #ffffff, transparent)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24" style={{ background: "linear-gradient(to left, #ffffff, transparent)" }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mt-10">
        {/* Prev */}
        <button
          onClick={handlePrev}
          className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all shadow-sm"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {businesses.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDot(i)}
              className="transition-all rounded-full"
              style={{
                width: i === index ? 20 : 6,
                height: 6,
                background: i === index ? "#0ea5e9" : "#d1d5db",
              }}
              aria-label={`Ir a ${i + 1}`}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={handleNext}
          className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-all shadow-sm"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  )
}
