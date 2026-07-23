"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@/types/models";

interface PermissionGuardProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
