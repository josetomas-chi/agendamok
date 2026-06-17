import "next-auth"

type UserRole = "SUPER_ADMIN" | "BUSINESS_OWNER" | "STAFF" | "CLIENT"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
    }
  }
  interface User {
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
  }
}
