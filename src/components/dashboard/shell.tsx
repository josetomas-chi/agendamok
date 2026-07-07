"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/topbar"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { BottomNav } from "@/components/dashboard/bottom-nav"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [businessType, setBusinessType] = useState<string>("GENERAL")

  useEffect(() => {
    fetch("/api/me/business").then(r => r.json()).then(d => {
      if (d.business?.businessType) setBusinessType(d.business.businessType)
    }).catch(() => {})
  }, [])

  const isSports = businessType === "SPORTS_CLUB"

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: isSports ? "#ffffff" : "#52525a" }}>
      <CommandPalette />
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={[
        "fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0",
        "transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(o => !o)} isSports={isSports} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="p-4 md:p-6 page-enter">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
