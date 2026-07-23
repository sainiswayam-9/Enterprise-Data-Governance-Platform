"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { userService } from "@/services/user.service";
import type { AuthUser } from "@/types/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await userService.list();
      setUsers(response);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load users.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <RoleGuard allowedRoles={["manager", "hr"]}>
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <Badge variant="secondary" className="w-fit">User administration</Badge>
              <CardTitle className="mt-2 text-3xl">Users</CardTitle>
              <CardDescription className="text-base">Managed directly from the auth service.</CardDescription>
            </div>
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground transition-colors hover:bg-accent"
              aria-label="Refresh users"
            >
              <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Failed to load users.</p>
                <p className="mt-1 text-destructive/80">{errorMessage ?? "Please retry the request."}</p>
                <button
                  type="button"
                  onClick={() => void loadUsers()}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-border/60 bg-background px-4 text-sm font-medium text-foreground"
                >
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                No users were returned by the backend.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {users.map((item) => (
                  <Card key={item.id} className="border-border/60 bg-muted/20">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.username}</p>
                          <p className="text-sm text-muted-foreground">{item.email}</p>
                        </div>
                        <Badge variant={item.is_active ? "success" : "destructive"}>{item.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border/60 px-3 py-1">Role: {item.role}</span>
                        {item.created_by ? <span className="rounded-full border border-border/60 px-3 py-1">Created by: {item.created_by}</span> : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Access notes</CardTitle>
            <CardDescription>Why this screen is role-gated</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Scoped access
              </div>
              <p className="mt-2 text-sm text-foreground">Only manager and HR users can see or manage this route.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Server enforced
              </div>
              <p className="mt-2 text-sm text-foreground">The middleware and backend both validate the same access rules.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
