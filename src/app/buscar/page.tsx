"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, MapPin, Navigation, Clock, ChevronRight, Tag } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1c1c1e]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-sm hidden sm:block">AgendaMok</span>
          </Link>

          {/* Search bar inline */}
          <div className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 pl-9 pr-4 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="">Todos los rubros</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className={`h-10 px-4 rounded-xl border text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                coords ? "border-green-400 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              } disabled:opacity-50`}
            >
              <Navigation className="w-4 h-4" />
              {locating ? "..." : coords ? "Ubicación activa" : "Mi ubicación"}
            </button>
          </div>

          <Link href="/auth/login" className="text-xs text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 hidden sm:block">
            Soy negocio →
          </Link>
        </div>
        {locError && <p className="text-center text-xs text-red-500 pb-2">{locError}</p>}
      </div>

      {/* Category pills */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setCategory("")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${!category ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(category === cat ? "" : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${category === cat ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loading && (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 animate-pulse" />
            ))}
          </>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium text-gray-600">No encontramos resultados</p>
            <p className="text-sm mt-1">Intenta con otro rubro o amplía el radio de búsqueda</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📍</div>
            <p className="font-medium text-gray-600">Selecciona un rubro para comenzar</p>
            <p className="text-sm mt-1">También puedes activar tu ubicación para ver negocios cercanos</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-gray-500">
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
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="flex">
        {/* Left: photo */}
        <div className="w-56 flex-shrink-0 relative bg-gray-100 hidden sm:block">
          {biz.logo ? (
            <Image src={biz.logo} alt={biz.name} fill className="object-cover" sizes="224px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 min-h-[180px]">
              <span className="text-5xl font-bold text-primary/30">{biz.name[0]}</span>
            </div>
          )}
        </div>

        {/* Right: info + services */}
        <div className="flex-1 min-w-0">
          {/* Business info strip */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
            {/* Mobile logo */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 sm:hidden bg-gray-100 flex items-center justify-center">
              {biz.logo
                ? <Image src={biz.logo} alt={biz.name} width={40} height={40} className="object-cover w-full h-full" />
                : <span className="font-bold text-primary">{biz.name[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm uppercase tracking-wide truncate">{biz.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                <span className="text-primary font-medium">{biz.category}</span>
                {(biz.address || biz.city) && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {[biz.address, biz.city].filter(Boolean).join(", ")}
                  </span>
                )}
                {biz.distance !== null && (
                  <span className="font-medium text-green-600">
                    {biz.distance < 1 ? `${Math.round(biz.distance * 1000)} m` : `${biz.distance.toFixed(1)} km`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Services list */}
          <div className="divide-y divide-gray-50">
            {biz.services.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-400">Sin servicios publicados</div>
            ) : (
              visibleServices.map(svc => (
                <div key={svc.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wide truncate">{svc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration} min</span>
                      {svc.description && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <Tag className="w-3 h-3 flex-shrink-0" />{svc.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-700">
                      ${Number(svc.price).toLocaleString("es-CL")}
                    </span>
                    <Link
                      href={`/book/${biz.slug}?serviceId=${svc.id}`}
                      className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Agendar
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Show more / Ver perfil */}
          {biz.services.length > 3 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline"
              >
                {showAll ? "Ver menos" : `Ver todos los servicios (${biz.services.length})`}
                <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
              </button>
              <Link href={`/book/${biz.slug}`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Ver perfil →
              </Link>
            </div>
          )}
          {biz.services.length <= 3 && biz.services.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100">
              <Link href={`/book/${biz.slug}`} className="text-xs text-gray-400 hover:text-primary transition-colors">
                Ver perfil completo →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
