"use client"

import { createContext, useContext } from "react"

export type MemberRole = "ADMIN" | "RECEPTIONIST"

type BusinessContextValue = {
  businessId: string
  businessName: string
  businessLogo: string | null
  businessType: string
  hasBsale: boolean
  memberRole: MemberRole
}

const BusinessContext = createContext<BusinessContextValue>({
  businessId: "",
  businessName: "",
  businessLogo: null,
  businessType: "GENERAL",
  hasBsale: false,
  memberRole: "ADMIN",
})

export function BusinessProvider({
  businessId, businessName, businessLogo, businessType, hasBsale, memberRole, children,
}: BusinessContextValue & { children: React.ReactNode }) {
  return (
    <BusinessContext.Provider value={{ businessId, businessName, businessLogo, businessType, hasBsale, memberRole }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}

export function useIsAdmin() {
  const { memberRole } = useContext(BusinessContext)
  return memberRole === "ADMIN"
}
