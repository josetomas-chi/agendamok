import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
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
    SUPER_ADMIN: "bg-red-100 text-red-700",
    BUSINESS_OWNER: "bg-indigo-100 text-indigo-700",
    STAFF: "bg-blue-100 text-blue-700",
    CLIENT: "bg-gray-100 text-gray-600",
  }
  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    BUSINESS_OWNER: "Propietario",
    STAFF: "Staff",
    CLIENT: "Cliente",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground text-sm mt-1">{users.length} usuarios registrados</p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Negocio</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registro</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No hay usuarios
                </td>
              </tr>
            ) : users.map((u: typeof users[number]) => (
              <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">
                      {(u.name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{u.name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role]}`}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">
                  {u.businessOwner?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.password ? "default" : "secondary"}>
                    {u.password ? "Activo" : "Pendiente"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">
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
