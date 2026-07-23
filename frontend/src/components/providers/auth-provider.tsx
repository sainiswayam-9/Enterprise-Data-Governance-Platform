"use client";

import * as React from "react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { authService } from "@/services/auth.service";
import type { AppRole, AuthUser, LoginCredentials, SessionState } from "@/types/auth";
import type { Permission } from "@/types/models";
import { hasPermissionForRole } from "@/lib/permissions";

interface AuthContextValue extends SessionState {
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
  hasRole: (roles: AppRole | AppRole[]) => boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  isAuthenticated: boolean;
}

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function setSessionState(
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>,
  setStatus: React.Dispatch<React.SetStateAction<SessionState["status"]>>,
  nextUser: AuthUser | null
) {
  startTransition(() => {
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "unauthenticated");
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");

  const refreshSession = useCallback(async () => {
    try {
      const session = await authService.me();
      setSessionState(setUser, setStatus, session);
      return session;
    } catch {
      setSessionState(setUser, setStatus, null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authService.login(credentials);
    setSessionState(setUser, setStatus, result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSessionState(setUser, setStatus, null);
  }, []);

  const hasRole = useCallback(
    (roles: AppRole | AppRole[]) => {
      if (!user) {
        return false;
      }

      const roleList = Array.isArray(roles) ? roles : [roles];
      return roleList.includes(user.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: Permission | Permission[]) => hasPermissionForRole(user?.role, permission),
    [user?.role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      logout,
      refreshSession,
      hasRole,
      hasPermission,
      isAuthenticated: status === "authenticated" && Boolean(user),
    }),
    [hasPermission, hasRole, login, logout, refreshSession, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
