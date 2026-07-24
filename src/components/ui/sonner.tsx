"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#0d1b2a",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "12px 16px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          gap: "10px",
        },
        classNames: {
          success: "toast-success",
          error: "toast-error",
          warning: "toast-warning",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
