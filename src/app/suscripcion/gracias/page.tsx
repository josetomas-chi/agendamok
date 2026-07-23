import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import GraciasContent from "./gracias-content"

export default function SuscripcionGraciasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8fafc" }}>
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
        </div>
      }
    >
      <GraciasContent />
    </Suspense>
  )
}
