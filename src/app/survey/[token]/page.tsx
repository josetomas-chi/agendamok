"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Star } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type SurveyData = {
  id: string
  answeredAt: string | null
  business: { name: string; logo: string | null }
  appointment: {
    startTime: string
    service: { name: string }
    staff: { user: { name: string | null } }
  }
}

export default function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [error, setError] = useState("")
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch(`/api/survey/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setSurvey(d.survey)
          if (d.survey.answeredAt) setDone(true)
        }
      })
  }, [token])

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    const r = await fetch(`/api/survey/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    })
    if (r.ok) setDone(true)
    else setError("Error al enviar. Intenta nuevamente.")
    setSubmitting(false)
  }

  const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"]
  const COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"]

  if (error) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">Encuesta no disponible</h1>
        <p className="text-gray-500 text-sm">{error === "Encuesta expirada" ? "Esta encuesta ya expiró (tenía validez de 7 días)." : error}</p>
      </div>
    </div>
  )

  if (!survey) return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 px-6 py-8 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
            {survey.business.logo
              ? <img src={survey.business.logo} alt="" className="w-full h-full object-cover rounded-2xl" />
              : survey.business.name[0]
            }
          </div>
          <h1 className="font-bold text-lg">{survey.business.name}</h1>
          <p className="text-sky-100 text-sm mt-1">
            {survey.appointment.service.name} · {format(new Date(survey.appointment.startTime), "d MMM yyyy", { locale: es })}
          </p>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Gracias por tu opinión!</h2>
            <p className="text-gray-500 text-sm">Tu feedback ayuda a mejorar el servicio.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="font-semibold text-gray-800 mb-1">¿Cómo fue tu experiencia?</p>
              <p className="text-sm text-gray-400">con {survey.appointment.staff.user.name}</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className="w-10 h-10 transition-colors"
                    fill={(hovered || rating) >= s ? COLORS[(hovered || rating)] : "none"}
                    stroke={(hovered || rating) >= s ? COLORS[(hovered || rating)] : "#d1d5db"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {(hovered || rating) > 0 && (
              <p className="text-center text-sm font-semibold transition-colors" style={{ color: COLORS[hovered || rating] }}>
                {LABELS[hovered || rating]}
              </p>
            )}

            {/* Comment */}
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">
                Comentario <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="¿Algo que quieras destacar o mejorar?"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400 text-gray-800"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!rating || submitting}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {submitting ? "Enviando..." : "Enviar opinión"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
