"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, MapPin, Navigation, Clock, ChevronRight, Tag, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const BUSINESS_CARDS = [
  { name: "Kinesiólogo",        category: "Kinesiología",          photo: "photo-1571019613454-1cb2f99b2d8b" },
  { name: "Peluquería",         category: "Peluquería",            photo: "photo-1522337360788-8b13dee7a37e" },
  { name: "Barbería",           category: "Barbería",              photo: "photo-1503951914875-452162b0f3f1" },
  { name: "Nutricionista",      category: "Nutrición",             photo: "photo-1490645935967-10de6ba17061" },
  { name: "Masajes",            category: "Masajes",               photo: "photo-1544161515-4ab6ce6db874" },
  { name: "Acupuntura",         category: "Kinesiología",          photo: "photo-1512290923902-8a9f81dc236c" },
  { name: "Psicólogo",          category: "Psicología",            photo: "photo-1573497019940-1c28c88b4f3e" },
  { name: "Tatuador",           category: "Tatuaje",               photo: "photo-1598371839696-5c5bb00bdc28" },
  { name: "Fotógrafo",          category: "Estética",              photo: "photo-1542038784456-1ea8e935640e" },
  { name: "Entrenador Personal",category: "Entrenamiento Personal", photo: "photo-1571019614242-c5c5dee9f50b" },
  { name: "Manicure & Pedicure",category: "Manicura",              photo: "photo-1604654894610-df63bc536371" },
  { name: "Dentista",           category: "Odontología",           photo: "photo-1606811971618-4486d14f3f99" },
  { name: "Médico",             category: "Medicina General",      photo: "photo-1559839734-2b71ea197ec2" },
  { name: "Veterinario",        category: "Veterinaria",           photo: "photo-1581888227599-779811939961" },
  { name: "Spa",                category: "Masajes",               photo: "photo-1540555700478-4be289fbecef" },
  { name: "Centro Estético",    category: "Estética",              photo: "photo-1570172619644-dfd03ed5d881" },
  { name: "Yoga",               category: "Yoga",                  photo: "photo-1506126613408-eca07ce68773" },
  { name: "Pilates",            category: "Pilates",               photo: "photo-1518611012118-696072aa579a" },
  { name: "Fisioterapia",       category: "Fisioterapia",          photo: "photo-1576091160550-2173dba999ef" },
  { name: "Taller Mecánico",    category: "Medicina General",      photo: "photo-1487754180451-c456f719a1fc" },
]

const CATEGORIES = [
  "Peluquería", "Barbería", "Kinesiología", "Psicología", "Nutrición",
  "Odontología", "Medicina General", "Fisioterapia", "Yoga", "Pilates",
  "Estética", "Manicura", "Tatuaje", "Veterinaria", "Entrenamiento Personal",
  "Masajes", "Quiropraxia", "Fonoaudiología", "Dermatología",
]

type Service = { id: string; name: string; duration: number; price: number; color: string; description: string | null }
type Business = {
  id: string; name: string; slug: string; category: string
  description: string | null; logo: string | null
  address: string | null; city: string | null; phone: string | null
  latitude: number | null; longitude: number | null
  distance: number | null; services: Service[]
}

export default function BuscarPage() {
  const [category, setCategory] = useState("")
  const [results, setResults] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locError, setLocError] = useState("")
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (lat?: number, lng?: number, cat?: string) => {
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams()
    const useCat = cat ?? category
    if (useCat) params.set("category", useCat)
    if (lat !== undefined) params.set("lat", String(lat))
    if (lng !== undefined) params.set("lng", String(lng))
    params.set("radius", "30")
    const r = await fetch(`/api/search?${params}`)
    const d = await r.json()
    setResults(d.businesses || [])
    setLoading(false)
  }, [category])

  function useMyLocation() {
    setLocError("")
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setCoords({ lat, lng })
        setLocating(false)
        search(lat, lng, category)
      },
      () => { setLocError("No se pudo obtener tu ubicación."); setLocating(false) }
    )
  }

  useEffect(() => {
    if (category) search(coords?.lat, coords?.lng, category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return (
    <div className="min-h-screen bg-[#1a1a1e] text-white">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#28282c]/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: "0 0 10px rgba(56,189,248,0.4)" }}>
              <img src="/mok-icon.png" alt="AgendaMok" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-[15px] tracking-tight hidden sm:block">
              Agenda<span className="text-sky-400">Mok</span>
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.06] pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-400 appearance-none"
              >
                <option value="" className="bg-[#28282c]">Todos los rubros</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#28282c]">{c}</option>)}
              </select>
            </div>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className={`h-10 px-4 rounded-xl border text-sm flex items-center gap-2 transition-all whitespace-nowrap disabled:opacity-50 ${
                coords
                  ? "border-sky-400/50 bg-sky-500/10 text-sky-300"
                  : "border-white/10 bg-white/[0.05] text-white/50 hover:text-white/80 hover:border-white/20"
              }`}
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              <span className="hidden sm:inline">{locating ? "Buscando..." : coords ? "Ubicación activa" : "Mi ubicación"}</span>
            </button>
          </div>

          <Link href="/auth/login" className="text-xs text-white/35 hover:text-white/70 transition-colors flex-shrink-0 hidden sm:block">
            Soy negocio →
          </Link>
        </div>
        {locError && <p className="text-center text-xs text-red-400 pb-2">{locError}</p>}
      </div>

      {/* Category pills */}
      <div className="bg-[#28282c]/60 border-b border-white/6">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategory("")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              !category ? "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]" : "bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white/80"
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? "" : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                category === cat ? "bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]" : "bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/[0.04] rounded-2xl h-48 animate-pulse border border-white/6" />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔍</div>
            <p className="font-semibold text-white/70">No encontramos resultados</p>
            <p className="text-sm text-white/35 mt-1">Intenta con otro rubro o amplía el radio de búsqueda</p>
          </div>
        )}

        {!loading && !searched && (
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-5">Explora por rubro</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {BUSINESS_CARDS.map(b => (
                <button
                  key={b.name}
                  onClick={() => setCategory(b.category)}
                  className="group relative overflow-hidden rounded-2xl aspect-[3/4] border border-white/[0.07] hover:border-sky-400/40 transition-all hover:scale-[1.02]"
                >
                  <img
                    src={`https://images.unsplash.com/${b.photo}?w=360&h=480&fit=crop&crop=faces,center&auto=format&q=70`}
                    alt={b.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%)" }} />
                  <div className="absolute bottom-0 inset-x-0" style={{ height: 3, background: "linear-gradient(90deg, #0ea5e9, #62CBF2)" }} />
                  <p className="absolute bottom-0 inset-x-0 pb-4 px-2 text-white text-center font-bold text-[12px] leading-tight" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                    {b.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-white/35">
              {results.length} {results.length === 1 ? "resultado" : "resultados"}
              {category && ` · ${category}`}
              {coords && " · ordenados por cercanía"}
            </p>
            {results.map(biz => (
              <BusinessCard key={biz.id} biz={biz} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function BusinessCard({ biz }: { biz: Business }) {
  const [showAll, setShowAll] = useState(false)
  const visibleServices = showAll ? biz.services : biz.services.slice(0, 3)

  return (
    <div className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.07] hover:border-white/[0.12] transition-colors">
      <div className="flex">
        {/* Left: photo */}
        <div className="w-48 flex-shrink-0 relative hidden sm:block" style={{ minHeight: 160 }}>
          {biz.logo ? (
            <Image src={biz.logo} alt={biz.name} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-500/20 to-sky-500/5" style={{ minHeight: 160 }}>
              <span className="text-5xl font-bold text-sky-400/30">{biz.name[0]}</span>
            </div>
          )}
        </div>

        {/* Right: info + services */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 sm:hidden bg-white/[0.08] flex items-center justify-center">
              {biz.logo
                ? <Image src={biz.logo} alt={biz.name} width={40} height={40} className="object-cover w-full h-full" />
                : <span className="font-bold text-sky-400">{biz.name[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">{biz.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                <span className="text-sky-400 font-medium">{biz.category}</span>
                {(biz.address || biz.city) && (
                  <span className="flex items-center gap-1 text-white/35">
                    <MapPin className="w-3 h-3" />
                    {[biz.address, biz.city].filter(Boolean).join(", ")}
                  </span>
                )}
                {biz.distance !== null && (
                  <span className="font-medium text-emerald-400">
                    {biz.distance < 1 ? `${Math.round(biz.distance * 1000)} m` : `${biz.distance.toFixed(1)} km`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            {biz.services.length === 0 ? (
              <div className="px-5 py-4 text-sm text-white/30">Sin servicios publicados</div>
            ) : (
              visibleServices.map(svc => (
                <div key={svc.id} className="px-5 py-3 flex items-center gap-3 border-b border-white/[0.04] last:border-0">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/85 truncate">{svc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-white/35">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration} min</span>
                      {svc.description && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <Tag className="w-3 h-3 flex-shrink-0" />{svc.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-white/80">
                      ${Number(svc.price).toLocaleString("es-CL")}
                    </span>
                    <Link
                      href={`/book/${biz.slug}?serviceId=${svc.id}`}
                      className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
                    >
                      Agendar
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {biz.services.length > 3 && (
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-sm font-semibold text-sky-400 flex items-center gap-1 hover:text-sky-300 transition-colors"
              >
                {showAll ? "Ver menos" : `Ver todos los servicios (${biz.services.length})`}
                <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
              </button>
              <Link href={`/book/${biz.slug}`} className="text-xs text-white/25 hover:text-white/50 transition-colors">
                Ver perfil →
              </Link>
            </div>
          )}
          {biz.services.length <= 3 && biz.services.length > 0 && (
            <div className="px-5 py-2.5 border-t border-white/[0.06]">
              <Link href={`/book/${biz.slug}`} className="text-xs text-white/25 hover:text-sky-400 transition-colors">
                Ver perfil completo →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
