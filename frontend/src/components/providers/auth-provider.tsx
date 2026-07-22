"use client";

import * as React from "react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type { AppRole, AuthUser, LoginCredentials, SessionState } from "@/types/auth";

interface AuthContextValue extends SessionState {
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
  hasRole: (roles: AppRole | AppRole[]) => boolean;
  isAuthenticated: boolean;
}

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function setSessionState(setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>, setStatus: React.Dispatch<React.SetStateAction<SessionState["status"]>>, nextUser: AuthUser | null) {
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
      const response = await apiClient.get<AuthUser>("/auth/me");
      setSessionState(setUser, setStatus, response.data);
      return response.data;
    } catch {
      setSessionState(setUser, setStatus, null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      await apiClient.post("/auth/login", credentials);
      const session = await refreshSession();

      if (!session) {
        throw new Error("Login succeeded but the session could not be restored.");
      }

      return session;
    },
    [refreshSession]
  );

  const logout = useCallback(async () => {
    [hasRole, login, logout, refreshSession, status, user]
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      logout,
      refreshSession,
      hasRole,
      isAuthenticated: status === "authenticated" && Boolean(user),
    }),
    [hasRole, ಲോഗಿನ್, logout, refreshSession, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
