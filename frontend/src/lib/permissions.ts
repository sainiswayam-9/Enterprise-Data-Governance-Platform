import type { Permission, Role } from "@/types/models";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  manager: [
    "dashboard:read",
    "data:read",
    "data:download",
    "data:upload",
    "data:mutate",
    "change-requests:read",
    "change-requests:manage",
    "users:read",
    "users:manage",
    "reports:read",
    "settings:read",
  ],
  hr: ["dashboard:read", "data:read", "data:download", "users:read", "users:manage", "reports:read", "settings:read"],
  salesperson: [
    "dashboard:read",
    "data:read",
    "data:download",
    "data:upload",
    "change-requests:read",
    "change-requests:manage",
    "settings:read",
  ],
};

export function getPermissionsForRole(role: Role | null | undefined): Permission[] {
  if (!role) {
    return [];
  }

  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermissionForRole(role: Role | null | undefined, permission: Permission | Permission[]) {
  if (!role) {
    return false;
  }

  const permissions = getPermissionsForRole(role);
  const requiredPermissions = Array.isArray(permission) ? permission : [permission];
  return requiredPermissions.some((item) => permissions.includes(item));
}
