import { APP_ROLES } from "@/lib/backend";
import { getPermissionsForRole } from "@/lib/permissions";
import type { AppRole } from "@/types/auth";
import type { Permission } from "@/types/models";

export interface NavigationItem {
  label: string;
  href: string;
  description: string;
  iconKey: string;
  roles: AppRole[];
  permissions: Permission[];
}

export interface RouteAccessRule {
  pattern: string;
  roles: AppRole[];
}

const allRoles = [...APP_ROLES];

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Overview, metrics, and activity",
    iconKey: "layout-dashboard",
    roles: allRoles,
    permissions: ["dashboard:read"],
  },
  {
    label: "Data Explorer",
    href: "/data",
    description: "Search and download records",
    iconKey: "database",
    roles: allRoles,
    permissions: ["data:read", "data:download"],
  },
  {
    label: "Change Requests",
    href: "/change-requests",
    description: "Review and resolve requests",
    iconKey: "square-pen",
    roles: ["manager", "salesperson"],
    permissions: ["change-requests:read", "change-requests:manage"],
  },
  {
    label: "Users",
    href: "/users",
    description: "Manage user accounts and access",
    iconKey: "users",
    roles: ["manager", "hr"],
    permissions: ["users:read", "users:manage"],
  },
  {
    label: "Reports",
    href: "/reports",
    description: "Export and audit operational data",
    iconKey: "bar-chart-3",
    roles: ["manager", "hr"],
    permissions: ["reports:read"],
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Appearance and workspace preferences",
    iconKey: "settings-2",
    roles: allRoles,
    permissions: ["settings:read"],
  },
];

export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { pattern: "/dashboard/:path*", roles: allRoles },
  { pattern: "/data/:path*", roles: allRoles },
  { pattern: "/change-requests/:path*", roles: ["manager", "salesperson"] },
  { pattern: "/users/:path*", roles: ["manager", "hr"] },
  { pattern: "/reports/:path*", roles: ["manager", "hr"] },
  { pattern: "/settings/:path*", roles: allRoles },
];

function rulePrefix(pattern: string) {
  return pattern.replace(/\/:path\*$/, "");
}

export function findRouteAccessRule(pathname: string) {
  return ROUTE_ACCESS_RULES.find((rule) => {
    const prefix = rulePrefix(rule.pattern);
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function getVisibleNavigationItems(role: AppRole | null) {
  if (!role) {
    return [];
  }

  const rolePermissions = getPermissionsForRole(role);
  return NAVIGATION_ITEMS.filter(
    (item) => item.roles.includes(role) && item.permissions.some((permission) => rolePermissions.includes(permission))
  );
}

export function getDefaultRouteForRole(role: AppRole) {
  if (role === "hr") {
    return "/users";
  }

  if (role === "salesperson") {
    return "/data";
  }

  return "/dashboard";
}
