export type Permission =
  | "appointments"
  | "clients"
  | "services"
  | "staff"
  | "payments"
  | "reports"
  | "marketing"
  | "surveys"
  | "settings"

export type PermissionMap = Partial<Record<Permission, boolean>>

// Default permissions for each role
export const ROLE_DEFAULTS: Record<"ADMIN" | "RECEPTIONIST", Record<Permission, boolean>> = {
  ADMIN: {
    appointments: true,
    clients:      true,
    services:     true,
    staff:        true,
    payments:     true,
    reports:      true,
    marketing:    true,
    surveys:      true,
    settings:     true,
  },
  RECEPTIONIST: {
    appointments: true,
    clients:      true,
    services:     false,
    staff:        false,
    payments:     true,
    reports:      false,
    marketing:    false,
    surveys:      false,
    settings:     false,
  },
}

// Merge role defaults with custom overrides stored in DB
export function resolvePermissions(
  role: "ADMIN" | "RECEPTIONIST",
  overrides: PermissionMap = {}
): Record<Permission, boolean> {
  const defaults = ROLE_DEFAULTS[role]
  return { ...defaults, ...overrides }
}

export function can(
  role: "ADMIN" | "RECEPTIONIST",
  overrides: PermissionMap,
  permission: Permission
): boolean {
  return resolvePermissions(role, overrides)[permission] ?? false
}
