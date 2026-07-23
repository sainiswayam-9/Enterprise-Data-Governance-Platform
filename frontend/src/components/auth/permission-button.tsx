"use client";

import type { ReactElement, ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "@/types/models";

interface PermissionButtonProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionButton({ permission, children, fallback = null }: PermissionButtonProps) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
