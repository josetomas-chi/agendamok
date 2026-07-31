"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#1a1a1e] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6">
        <img src="/icon-192.png" alt="AgendaMok" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Sin conexión</h1>
      <p className="text-gray-400 text-sm max-w-xs mb-8">
        Parece que no tienes internet en este momento. Revisa tu conexión y vuelve a intentarlo.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-sky-500 hover:bg-sky-400 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
      >
        Reintentar
      </button>
    </div>
  )
}
