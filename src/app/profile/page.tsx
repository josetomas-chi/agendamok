"use client"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const ProfileContent = dynamic(() => import("./profile-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f11" }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#38bdf8" }} />
    </div>
  ),
})

export default function ProfilePage() {
  return <ProfileContent />
}
