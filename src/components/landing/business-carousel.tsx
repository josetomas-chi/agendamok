"use client"

const businesses = [
  { name: "Barbería",            emoji: "🪒", photo: "photo-1503951914875-452162b0f3f1" },
  { name: "Peluquería",          emoji: "✂️", photo: "photo-1522337360788-8b13dee7a37e" },
  { name: "Kinesiología",        emoji: "🏋️", photo: "photo-1571019613454-1cb2f99b2d8b" },
  { name: "Masajes",             emoji: "💆", photo: "photo-1544161515-4ab6ce6db874" },
  { name: "Centro Estético",     emoji: "💅", photo: "photo-1570172619644-dfd03ed5d881" },
  { name: "Dentista",            emoji: "🦷", photo: "photo-1606811971618-4486d14f3f99" },
  { name: "Yoga",                emoji: "🧘", photo: "photo-1506126613408-eca07ce68773" },
  { name: "Entrenador Personal", emoji: "💪", photo: "photo-1571019614242-c5c5dee9f50b" },
  { name: "Nutricionista",       emoji: "🥗", photo: "photo-1490645935967-10de6ba17061" },
  { name: "Médico",              emoji: "🩺", photo: "photo-1559839734-2b71ea197ec2" },
  { name: "Psicólogo",           emoji: "🧠", photo: "photo-1573497019940-1c28c88b4f3e" },
  { name: "Spa",                 emoji: "🛁", photo: "photo-1540555700478-4be289fbecef" },
  { name: "Manicure & Pedicure", emoji: "💅", photo: "photo-1604654894610-df63bc536371" },
  { name: "Veterinario",         emoji: "🐾", photo: "photo-1581888227599-779811939961" },
  { name: "Tatuador",            emoji: "🎨", photo: "photo-1598371839696-5c5bb00bdc28" },
  { name: "Acupuntura",          emoji: "✨", photo: "photo-1512290923902-8a9f81dc236c" },
  { name: "Coach",               emoji: "🎯", photo: "photo-1522202176988-66273c2fd55f" },
  { name: "Fotógrafo",           emoji: "📷", photo: "photo-1542038784456-1ea8e935640e" },
  { name: "Abogado",             emoji: "⚖️", photo: "photo-1589829545856-d10d557cf95f" },
  { name: "Taller Mecánico",     emoji: "🔧", photo: "photo-1487754180451-c456f719a1fc" },
]

export function BusinessCarousel() {
  return (
    <section className="relative py-0 overflow-hidden" style={{ background: "#0d1117" }}>
      <style>{`
        .biz-scroll-track {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 0 24px 16px;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .biz-scroll-track::-webkit-scrollbar { display: none; }
        .biz-card-new {
          flex-shrink: 0;
          width: 158px;
          height: 224px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          scroll-snap-align: start;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .biz-card-new:hover { transform: translateY(-5px); }
        .biz-card-new img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .biz-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0) 38%, rgba(0,0,0,0.82) 100%);
        }
        .biz-card-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 10px 13px;
        }
        .biz-card-label .biz-emoji {
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }
        .biz-card-label .biz-name {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.2;
          display: block;
        }
      `}</style>

      {/* Header */}
      <div className="text-center pt-14 pb-8 px-4">
        <div
          className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-medium tracking-wide"
          style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.25)" }}
        >
          Para cualquier rubro
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight" style={{ color: "#f0f6fc" }}>
          Para cualquier negocio de servicios
        </h2>
        <p className="text-base" style={{ color: "#8b949e" }}>Si tienes citas, AgendaMok es para ti</p>
      </div>

      {/* Scroll track */}
      <div className="biz-scroll-track">
        {businesses.map((b) => (
          <div key={b.name} className="biz-card-new">
            <img
              src={`https://images.unsplash.com/${b.photo}?w=316&h=448&fit=crop&crop=faces,center&auto=format&q=80`}
              alt={b.name}
              loading="lazy"
              draggable={false}
            />
            <div className="biz-card-overlay" />
            <div className="biz-card-label">
              <span className="biz-emoji">{b.emoji}</span>
              <span className="biz-name">{b.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <p className="text-center pb-12 text-xs" style={{ color: "#30363d" }}>
        desliza para ver más rubros →
      </p>
    </section>
  )
}
