"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, X, MessageCircle, Loader2 } from "lucide-react"

type Message = { role: "user" | "assistant"; content: string }

export function ChatWidget({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: `¡Hola! Soy el asistente de reservas de **${businessName}**. ¿En qué te puedo ayudar hoy?` }])
    }
  }, [open, businessName, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: "user", content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, businessId, businessName }),
      })
      const data = await res.json()
      setMessages([...next, { role: "assistant", content: data.reply }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Hubo un error. Por favor intentá de nuevo." }])
    } finally {
      setLoading(false)
    }
  }

  function renderText(text: string) {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    )
  }

  return (
    <>
      {/* Bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)", boxShadow: "0 4px 24px rgba(56,189,248,0.5)" }}
          aria-label="Abrir chat de reservas"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden flex flex-col"
          style={{ height: "520px", boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)", background: "#28282c" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white leading-none">Asistente de reservas</div>
              <div className="text-xs text-white/70 mt-0.5">{businessName}</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-sky-500 text-white rounded-br-sm"
                      : "text-white/85 rounded-bl-sm"
                  }`}
                  style={m.role === "assistant" ? { background: "rgba(255,255,255,0.07)" } : {}}
                >
                  {renderText(m.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 flex-shrink-0 border-t border-white/8">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
              <input
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                placeholder="Escribe un mensaje..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #38bdf8)" }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
