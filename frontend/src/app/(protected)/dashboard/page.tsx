"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Database, ShieldCheck, Users, Zap, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { PermissionButton } from "@/components/auth/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { dataService, type OverviewResponse } from "@/services/data.service";

const summaryCards = [
  {
    icon: ShieldCheck,
    title: "Secure session",
    description: "JWT validation is handled server-side and the browser never sees the raw token.",
  },
  {
    icon: Database,
    title: "Backend ready",
    description: "All data requests flow through same-origin Next routes and the existing FastAPI services.",
  },
  {
    icon: Users,
    title: "RBAC aware",
    description: "Navigation, guards, and action buttons all respect role-derived permissions.",
  },
  {
    icon: Zap,
    title: "Responsive shell",
    description: "Sidebar, navbar, dark mode, toasts, and loading states are wired for production use.",
  },
];

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const data = await dataService.getOverview();
      setOverview(data);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const totalDocuments = useMemo(
    () => overview?.categories.reduce((sum, item) => sum + item.document_count, 0) ?? 0,
    [overview]
  );

  const topCategories = overview?.categories.slice(0, 4) ?? [];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-border/60 bg-card/90 shadow-glow backdrop-blur">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Live workspace</Badge>
            <CardTitle className="mt-2 text-3xl">Welcome{user?.username ? `, ${user.username}` : ""}.</CardTitle>
            <CardDescription className="text-base">
              The dashboard is now reading real service data and will update automatically as the backend changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <PermissionButton permission="data:read">
              <Button asChild>
                <Link href="/data">
                  Open data explorer <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </PermissionButton>
            <PermissionButton permission="users:read">
              <Button variant="outline" asChild>
                <Link href="/users">Review user access</Link>
              </Button>
            </PermissionButton>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-primary/10 to-accent/40 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">Current session</CardTitle>
            <CardDescription>Role, identity, and access level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">User</span>
              <span className="font-medium text-foreground">{user?.username ?? "Restoring..."}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">{user?.email ?? "Pending"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Role</span>
              <Badge>{user?.role ?? "Unknown"}</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="border-border/60 bg-card/90 backdrop-blur">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="mt-4 text-xl">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Workspace overview</CardTitle>
              <CardDescription>Real counts from the data service</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void loadOverview()} aria-label="Refresh dashboard data">
              <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Failed to load dashboard data.</p>
                <p className="mt-1 text-destructive/80">{errorMessage ?? "Please retry the request."}</p>
                <Button className="mt-4" variant="outline" onClick={() => void loadOverview()}>
                  Retry
                </Button>
              </div>
            ) : topCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                No categories were returned by the backend yet.
              </div>
            ) : (
              topCategories.map((item) => (
                <div key={item.category} className="rounded-2xl border border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{item.category}</p>
                    <Badge variant="secondary">{item.document_count} records</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.fields.length > 0 ? `${item.fields.length} exposed field${item.fields.length === 1 ? "" : "s"}` : "No fields exposed yet"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">System metrics</CardTitle>
            <CardDescription>Loaded directly from the live API</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Collections</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{overview?.total ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{totalDocuments}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Permission</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {hasPermission("users:read") ? "User management enabled" : "Limited access"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Next route</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{user?.role ? (user.role === "hr" ? "/users" : user.role === "salesperson" ? "/data" : "/dashboard") : "/dashboard"}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
