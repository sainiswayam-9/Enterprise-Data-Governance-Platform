"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Database,
  FileUp,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { PermissionButton } from "@/components/auth/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { dataService } from "@/services/data.service";
import { userService } from "@/services/user.service";
import type { DataOverviewResponse, ChangeRequest } from "@/types/models";
import type { AuthUser } from "@/types/auth";

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur">
      <CardContent className="p-6">
        <Skeleton className="mb-3 h-4 w-24 rounded-lg" />
        <Skeleton className="mb-2 h-10 w-16 rounded-lg" />
        <Skeleton className="h-3 w-32 rounded-lg" />
      </CardContent>
    </Card>
  );
}

function RowSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  colorClass?: string;
}

function KpiCard({ icon: Icon, label, value, sub, colorClass = "bg-primary/10 text-primary" }: KpiCardProps) {
  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur transition-shadow hover:shadow-glow">
      <CardContent className="p-6">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface CrRowProps {
  item: ChangeRequest;
}

function CrRow({ item }: CrRowProps) {
  const statusVariant =
    item.status === "approved" ? "success" : item.status === "rejected" ? "destructive" : "secondary";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-4 py-3 transition-colors hover:bg-muted/20">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {item.category} — {item.action}
        </p>
        <p className="text-xs text-muted-foreground">by {item.requester}</p>
      </div>
      <Badge variant={statusVariant} className="shrink-0 capitalize">
        {item.status}
      </Badge>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();

  const [overview, setOverview] = useState<DataOverviewResponse | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const overviewData = await dataService.getOverview();
      setOverview(overviewData);

      // Load change requests (manager sees all, salesperson sees own)
      if (hasPermission("change-requests:manage")) {
        const crData = await dataService.getAllChangeRequests();
        setChangeRequests(crData);
      } else if (hasPermission("change-requests:read")) {
        const crData = await dataService.getMyChangeRequests();
        setChangeRequests(crData);
      }

      // Load users (manager/hr only)
      if (hasPermission("users:read")) {
        const userData = await userService.list();
        setUsers(userData);
      }

      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }, [hasPermission]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const totalDocuments = useMemo(
    () => overview?.categories.reduce((sum, c) => sum + c.document_count, 0) ?? 0,
    [overview]
  );

  const pendingCount = useMemo(() => changeRequests.filter((r) => r.status === "pending").length, [changeRequests]);
  const approvedCount = useMemo(() => changeRequests.filter((r) => r.status === "approved").length, [changeRequests]);
  const rejectedCount = useMemo(() => changeRequests.filter((r) => r.status === "rejected").length, [changeRequests]);
  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const recentRequests = useMemo(() => changeRequests.slice(0, 5), [changeRequests]);
  const topCategories = useMemo(() => (overview?.categories ?? []).slice(0, 5), [overview]);

  const roleLabel =
    user?.role === "manager" ? "Manager" : user?.role === "hr" ? "HR Administrator" : "Sales Representative";

  return (
    <div className="space-y-8 animate-slide-up">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2 w-fit">
            {roleLabel}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Welcome back, {user?.username ?? "…"}
          </h1>
          <p className="mt-1 text-muted-foreground">Here&apos;s an overview of your workspace.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={status === "loading"}
            aria-label="Refresh dashboard"
          >
            <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
          <PermissionButton permission="data:read">
            <Button asChild size="sm">
              <Link href="/data">
                Data explorer <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </PermissionButton>
        </div>
      </section>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Key Metrics</h2>
        {status === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {hasPermission("users:read") && (
              <>
                <KpiCard
                  icon={Users}
                  label="Total Users"
                  value={users.length}
                  sub={`${activeUsers} active`}
                  colorClass="bg-blue-500/10 text-blue-500"
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Active Users"
                  value={activeUsers}
                  sub={`${users.length - activeUsers} inactive`}
                  colorClass="bg-emerald-500/10 text-emerald-500"
                />
              </>
            )}
            <KpiCard
              icon={Database}
              label="Total Documents"
              value={totalDocuments.toLocaleString()}
              sub={`${overview?.total ?? 0} categories`}
              colorClass="bg-violet-500/10 text-violet-500"
            />
            <KpiCard
              icon={Clock}
              label="Pending Requests"
              value={pendingCount}
              sub="awaiting review"
              colorClass="bg-amber-500/10 text-amber-500"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Approved"
              value={approvedCount}
              sub="change requests"
              colorClass="bg-emerald-500/10 text-emerald-500"
            />
            <KpiCard
              icon={XCircle}
              label="Rejected"
              value={rejectedCount}
              sub="change requests"
              colorClass="bg-rose-500/10 text-rose-500"
            />
          </div>
        )}
      </section>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {status === "error" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm">
            <p className="font-medium text-destructive">Failed to load dashboard data.</p>
            <p className="mt-1 text-destructive/80">{errorMessage}</p>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => void loadDashboard()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Main panels ───────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Recent Change Requests */}
        {hasPermission("change-requests:read") && (
          <Card className="border-border/60 bg-card/90 backdrop-blur">
            <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-xl">Recent Change Requests</CardTitle>
                <CardDescription>{changeRequests.length} total requests</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/change-requests">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {status === "loading" ? (
                <RowSkeleton n={4} />
              ) : recentRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No change requests yet.
                </div>
              ) : (
                recentRequests.map((item) => <CrRow key={item.id} item={item} />)
              )}
            </CardContent>
          </Card>
        )}

        {/* Data Categories */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-xl">Data Categories</CardTitle>
              <CardDescription>{overview?.total ?? 0} active collections</CardDescription>
            </div>
            <PermissionButton permission="data:read">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/data">
                  Explorer <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </PermissionButton>
          </CardHeader>
          <CardContent className="space-y-2">
            {status === "loading" ? (
              <RowSkeleton n={4} />
            ) : topCategories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                <Database className="mx-auto mb-2 h-8 w-8 opacity-40" />
                No data uploaded yet.{" "}
                {hasPermission("data:upload") && (
                  <Link href="/data" className="underline underline-offset-2 hover:text-foreground">
                    Upload now
                  </Link>
                )}
              </div>
            ) : (
              topCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-4 py-3 transition-colors hover:bg-muted/20"
                >
                  <div>
                    <p className="text-sm font-medium capitalize text-foreground">{cat.category}</p>
                    <p className="text-xs text-muted-foreground">{cat.fields.length} fields</p>
                  </div>
                  <Badge variant="secondary">{cat.document_count.toLocaleString()} records</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hasPermission("data:read") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/data">
                <Database className="h-5 w-5" />
                Browse Data
              </Link>
            </Button>
          )}
          {hasPermission("data:upload") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/data">
                <FileUp className="h-5 w-5" />
                Upload File
              </Link>
            </Button>
          )}
          {hasPermission("change-requests:read") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/change-requests">
                <ClipboardList className="h-5 w-5" />
                Change Requests
              </Link>
            </Button>
          )}
          {hasPermission("reports:read") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/reports">
                <BarChart3 className="h-5 w-5" />
                View Reports
              </Link>
            </Button>
          )}
          {hasPermission("users:read") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/users">
                <Users className="h-5 w-5" />
                Manage Users
              </Link>
            </Button>
          )}
          {hasPermission("users:manage") && (
            <Button variant="outline" className="h-auto flex-col gap-2 py-5 text-sm" asChild>
              <Link href="/reports">
                <TrendingUp className="h-5 w-5" />
                Analytics
              </Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
