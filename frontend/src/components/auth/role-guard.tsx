"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/types/auth";

interface RoleGuardProps {
  allowedRoles: AppRole | AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useAuth();
  return hasRole(allowedRoles) ? children : fallback;
}
