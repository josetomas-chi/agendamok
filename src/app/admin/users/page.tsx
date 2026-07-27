"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Users, Trash2, KeyRound, Search, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type User = {
  id: string
  name: string | null
  email: string
  role: string
  password: string | null
  createdAt: string
  businessOwner: { name: string } | null
}

const roleColor: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/20 text-red-400 border border-red-400/30",
  BUSINESS_OWNER: "bg-sky-500/20 text-sky-400 border border-sky-400/30",
  STAFF: "bg-violet-500/20 text-violet-400 border border-violet-400/30",
  CLIENT: "bg-white/10 text-white/50 border border-white/10",
}
const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUSINESS_OWNER: "Propietario",
  STAFF: "Staff",
  CLIENT: "Cliente",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tempPassword, setTempPassword] = useState<{ name: string; pwd: string } | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const r = await fetch("/api/admin/users")
    const d = await r.json()
    setUsers(d.users || [])
    setLoading(false)
  }

  async function handleDelete(u: User) {
    if (!confirm(`¿Eliminar al usuario "${u.name || u.email}"? Esta acción no se puede deshacer.`)) return
    const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" })
    const d = await r.json()
    if (r.ok) { toast.success("Usuario eliminado"); loadUsers() }
    else toast.error(d.error || "Error al eliminar")
  }

  async function handleResetPassword(u: User) {
    if (!confirm(`¿Resetear la contraseña de "${u.name || u.email}"? Se generará una temporal.`)) return
    const r = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    })
    const d = await r.json()
    if (r.ok) setTempPassword({ name: u.name || u.email, pwd: d.tempPassword })
    else toast.error(d.error || "Error al resetear")
  }

  const filtered = users.filter(u =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{users.length} usuarios registrados</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 w-64" placeholder="Buscar usuario o email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.07]">
            <tr>
              {["Usuario", "Rol", "Negocio", "Estado", "Registro", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-white/40 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/[0.05]">
                  <td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 animate-pulse rounded" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-white/30">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay usuarios
                </td>
              </tr>
            ) : filtered.map((u, i) => (
              <tr key={u.id} className={`transition-colors hover:bg-white/[0.03] ${i !== filtered.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-xs flex-shrink-0">
                      {(u.name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white/90">{u.name || "Sin nombre"}</p>
                      <p className="text-xs text-white/40">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role]}`}>
                    {roleLabel[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50">{u.businessOwner?.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${u.password ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30" : "bg-amber-400/10 text-amber-400 border-amber-400/20"}`}>
                    {u.password ? "Activo" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40">{new Date(u.createdAt).toLocaleDateString("es-CL")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      title="Resetear contraseña" onClick={() => handleResetPassword(u)}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      title="Eliminar usuario" onClick={() => handleDelete(u)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Temp password dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Contraseña reseteada</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-white/60">
              Nueva contraseña temporal para <strong className="text-white">{tempPassword?.name}</strong>. Cópiala y envíasela al usuario — deberá cambiarla al ingresar.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
              <code className="flex-1 text-lg font-mono font-bold text-sky-400 tracking-widest">{tempPassword?.pwd}</code>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-white/40 hover:text-white"
                onClick={() => { navigator.clipboard.writeText(tempPassword?.pwd || ""); toast.success("Copiada") }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={() => setTempPassword(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
