"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, MapPin, Navigation, Star, Phone, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const CATEGORIES = [
  "Peluquería", "Barbería", "Kinesiología", "Psicología", "Nutrición",
  "Odontología", "Medicina General", "Fisioterapia", "Yoga", "Pilates",
  "Estética", "Manicura", "Tatuaje", "Veterinaria", "Entrenamiento Personal",
  "Masajes", "Quiropraxia", "Fonoaudiología", "Dermatología", "Otro",
]

type Business = {
  id: string; name: string; slug: string; category: string
  description: string | null; logo: string | null
  address: string | null; city: string | null; phone: string | null
  latitude: number | null; longitude: number | null
  distance: number | null
}

export default function BuscarPage() {
  const [query, setQuery] = useState("")
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
    if (cat ?? category) params.set("category", cat ?? category)
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
      () => {
        setLocError("No se pudo obtener tu ubicación. Revisa los permisos del navegador.")
        setLocating(false)
      }
    )
  }

  function handleSearch() {
    search(coords?.lat, coords?.lng, category)
  }

  useEffect(() => {
    if (category) search(coords?.lat, coords?.lng, category)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1c1c1e" }}>
      {/* Header */}
      <div className="border-b border-white/10" style={{ backgroundColor: "#2c2c30" }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-sm">AgendaMok</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Soy un negocio →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Encuentra profesionales cerca tuyo</h1>
        <p className="text-muted-foreground mb-8">Busca por rubro y reserva un turno en segundos</p>

        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar rubro o nombre..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full h-11 rounded-xl border border-white/10 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
            />
          </div>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="h-11 px-4 rounded-xl border border-white/10 flex items-center gap-2 text-sm hover:bg-white/5 transition-colors disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: "#3a3a3c", color: "#f4f4f5" }}
          >
            <Navigation className="w-4 h-4 text-primary" />
            {locating ? "Localizando..." : coords ? "Ubicación activa" : "Usar mi ubicación"}
          </button>
          <button
            onClick={handleSearch}
            className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Buscar
          </button>
        </div>

        {coords && (
          <p className="text-xs text-green-400 flex items-center justify-center gap-1 mb-2">
            <MapPin className="w-3 h-3" /> Ubicación detectada — mostrando negocios en radio de 30 km
          </p>
        )}
        {locError && <p className="text-xs text-red-400 mb-2">{locError}</p>}

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(category === cat ? "" : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                category === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ backgroundColor: "#2c2c30" }} />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: "#2c2c30" }}>
              🔍
            </div>
            <p className="font-medium">No encontramos resultados</p>
            <p className="text-sm mt-1">Intenta con otro rubro o amplía el radio de búsqueda</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} {results.length === 1 ? "resultado" : "resultados"}
              {category && ` · ${category}`}
              {coords && " · ordenados por cercanía"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map(b => (
                <Link key={b.id} href={`/book/${b.slug}`}
                  className="group rounded-2xl border border-white/10 p-4 flex gap-4 hover:border-primary/40 hover:bg-white/2 transition-all"
                  style={{ backgroundColor: "#2c2c30" }}>
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: "#3a3a3c" }}>
                    {b.logo
                      ? <Image src={b.logo} alt={b.name} width={56} height={56} className="object-cover w-full h-full" />
                      : b.name[0].toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate group-hover:text-primary transition-colors">{b.name}</p>
                        <p className="text-xs text-primary/80 font-medium">{b.category}</p>
                      </div>
                      {b.distance !== null && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {b.distance < 1 ? `${Math.round(b.distance * 1000)} m` : `${b.distance.toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                    {(b.city || b.address) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[b.address, b.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {b.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </>
        )}

        {!searched && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Selecciona un rubro o usa tu ubicación para comenzar
          </div>
        )}
      </div>
    </div>
  )
}
