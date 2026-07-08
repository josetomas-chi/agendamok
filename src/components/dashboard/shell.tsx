"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/topbar"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { BottomNav } from "@/components/dashboard/bottom-nav"

export function DashboardShell({
  children, businessId, businessName, businessLogo, businessType,
}: {
  children: React.ReactNode
  businessId: string
  businessName: string
  businessLogo: string | null
  businessType: string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <Sidebar onClose={() => setSidebarOpen(false)} isSports={isSports} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          isSports={isSports}
          businessId={businessId}
          businessName={businessName}
          businessLogo={businessLogo}
        />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="p-4 md:p-6 page-enter">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
