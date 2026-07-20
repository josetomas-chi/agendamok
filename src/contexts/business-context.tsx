"use client"

import { createContext, useContext } from "react"
import { type Permission, type PermissionMap, resolvePermissions } from "@/lib/permissions"

export type MemberRole = "ADMIN" | "RECEPTIONIST"

type BusinessContextValue = {
  businessId: string
  businessName: string
  businessLogo: string | null
  businessType: string
  hasBsale: boolean
  memberRole: MemberRole
  permissions: Record<Permission, boolean>
}

const BusinessContext = createContext<BusinessContextValue>({
  businessId: "",
  businessName: "",
  businessLogo: null,
  businessType: "GENERAL",
  hasBsale: false,
  memberRole: "ADMIN",
  permissions: resolvePermissions("ADMIN"),
})

export function BusinessProvider({
  businessId, businessName, businessLogo, businessType, hasBsale, memberRole, permissionOverrides, children,
}: Omit<BusinessContextValue, "permissions"> & { permissionOverrides?: PermissionMap; children: React.ReactNode }) {
  const permissions = resolvePermissions(memberRole, permissionOverrides)
  return (
    <BusinessContext.Provider value={{ businessId, businessName, businessLogo, businessType, hasBsale, memberRole, permissions }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}

export function useIsAdmin() {
  return useContext(BusinessContext).memberRole === "ADMIN"
}

export function useCan(permission: Permission) {
  return useContext(BusinessContext).permissions[permission] ?? false
}
