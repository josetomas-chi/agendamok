"use client"

import { createContext, useContext } from "react"

type BusinessContextValue = {
  businessId: string
  businessName: string
  businessLogo: string | null
  businessType: string
  hasBsale: boolean
}

const BusinessContext = createContext<BusinessContextValue>({
  businessId: "",
  businessName: "",
  businessLogo: null,
  businessType: "GENERAL",
  hasBsale: false,
})

export function BusinessProvider({
  businessId, businessName, businessLogo, businessType, hasBsale, children,
}: BusinessContextValue & { children: React.ReactNode }) {
  return (
    <BusinessContext.Provider value={{ businessId, businessName, businessLogo, businessType, hasBsale }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}
