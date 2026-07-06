import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"

export default async function AdminUsersPage() {
  const session = await auth()
  if ((session?.user as { role?: string })?.role !== "SUPER_ADMIN") redirect("/dashboard")

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      businessOwner: { select: { name: true } },
    },
  })

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

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{users.length} usuarios registrados</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "oklch(0.18 0.02 260)" }}>
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.07]">
            <tr>
              {["Usuario", "Rol", "Negocio", "Estado", "Registro"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-white/40 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-white/30">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay usuarios
                </td>
              </tr>
            ) : users.map((u: typeof users[number], i: number) => (
              <tr key={u.id} className={`transition-colors hover:bg-white/[0.03] ${i !== users.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
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
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/50 text-sm">
                  {u.businessOwner?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${u.password ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30" : "bg-amber-400/10 text-amber-400 border-amber-400/20"}`}>
                    {u.password ? "Activo" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40 text-sm">
                  {new Date(u.createdAt).toLocaleDateString("es-CL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
