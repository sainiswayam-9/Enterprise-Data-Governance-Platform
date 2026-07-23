"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  RefreshCcw,
  Users,
  XCircle,
  TrendingUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { dataService } from "@/services/data.service";
import { userService } from "@/services/user.service";
import type { DataOverviewResponse, ChangeRequest } from "@/types/models";
import type { AuthUser } from "@/types/auth";

// ── CSV generation helper ─────────────────────────────────────────────────────

function downloadCsvBlob(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
}

function StatCard({ icon: Icon, label, value, sub, colorClass = "bg-primary/10 text-primary" }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur transition-shadow hover:shadow-glow">
      <CardContent className="p-5">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const canViewUsers = hasPermission("users:read");

  const [overview, setOverview] = useState<DataOverviewResponse | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [overviewData, crData] = await Promise.all([
        dataService.getOverview(),
        hasPermission("change-requests:manage")
          ? dataService.getAllChangeRequests()
          : Promise.resolve([] as ChangeRequest[]),
      ]);
      setOverview(overviewData);
      setChangeRequests(crData);

      if (canViewUsers) {
        const userData = await userService.list();
        setUsers(userData);
      }
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load report data.";
      setError(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, [hasPermission, canViewUsers]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // ── Computed statistics ───────────────────────────────────────────────────

  const totalDocuments = useMemo(
    () => overview?.categories.reduce((sum, c) => sum + c.document_count, 0) ?? 0,
    [overview]
  );

  const totalCategories = overview?.total ?? 0;

  const pendingCr = useMemo(() => changeRequests.filter((r) => r.status === "pending").length, [changeRequests]);
  const approvedCr = useMemo(() => changeRequests.filter((r) => r.status === "approved").length, [changeRequests]);
  const rejectedCr = useMemo(() => changeRequests.filter((r) => r.status === "rejected").length, [changeRequests]);
  const totalCr = changeRequests.length;
  const approvalRate = totalCr > 0 ? Math.round((approvedCr / totalCr) * 100) : 0;

  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const inactiveUsers = useMemo(() => users.filter((u) => !u.is_active).length, [users]);

  const roleBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of users) {
      map[u.role] = (map[u.role] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const categoryRows = useMemo(
    () =>
      (overview?.categories ?? [])
        .slice()
        .sort((a, b) => b.document_count - a.document_count),
    [overview]
  );

  const topRequester = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cr of changeRequests) {
      map[cr.requester] = (map[cr.requester] ?? 0) + 1;
    }
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  }, [changeRequests]);

  // ── CSV Exports ───────────────────────────────────────────────────────────

  function exportUsersCsv() {
    if (users.length === 0) { toast.error("No user data to export."); return; }
    downloadCsvBlob(
      ["Username", "Email", "Role", "Active", "Created By"],
      users.map((u) => [u.username, u.email, u.role, u.is_active ? "Yes" : "No", u.created_by ?? "system"]),
      `users_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Users report downloaded.");
  }

  function exportApprovalsCsv() {
    if (changeRequests.length === 0) { toast.error("No change request data to export."); return; }
    downloadCsvBlob(
      ["ID", "Requester", "Category", "Action", "Status", "Created At", "Resolved At", "Resolved By"],
      changeRequests.map((cr) => [
        cr.id,
        cr.requester,
        cr.category,
        cr.action,
        cr.status,
        cr.created_at,
        cr.resolved_at ?? "",
        cr.resolved_by ?? "",
      ]),
      `change_requests_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Change requests report downloaded.");
  }

  function exportCategoriesCsv() {
    if (categoryRows.length === 0) { toast.error("No category data to export."); return; }
    downloadCsvBlob(
      ["Category", "Documents", "Fields"],
      categoryRows.map((c) => [c.category, String(c.document_count), c.fields.join("; ")]),
      `categories_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    toast.success("Categories report downloaded.");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <RoleGuard allowedRoles={["manager", "hr"]}>
      <div className="space-y-8 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-1 w-fit">Analytics</Badge>
            <h1 className="text-3xl font-bold tracking-tight font-display">Reports</h1>
            <p className="text-muted-foreground">System-wide statistics and exportable reports.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadReports()} disabled={status === "loading"}>
            <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        {/* Error */}
        {status === "error" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-sm">
              <p className="font-medium text-destructive">Failed to load report data.</p>
              <p className="mt-1 opacity-80 text-destructive">{error}</p>
              <Button className="mt-4" variant="outline" size="sm" onClick={() => void loadReports()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* KPI strip */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">System Overview</h2>
          {status === "loading" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-5">
                    <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
                    <Skeleton className="mb-2 h-4 w-20 rounded" />
                    <Skeleton className="h-8 w-14 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Database} label="Total Documents" value={totalDocuments.toLocaleString()} sub={`across ${totalCategories} categories`} colorClass="bg-violet-500/10 text-violet-500" />
              <StatCard icon={Layers} label="Categories" value={totalCategories} sub="active collections" colorClass="bg-blue-500/10 text-blue-500" />
              {canViewUsers && (
                <StatCard icon={Users} label="Total Users" value={users.length} sub={`${activeUsers} active · ${inactiveUsers} inactive`} colorClass="bg-emerald-500/10 text-emerald-500" />
              )}
              <StatCard icon={TrendingUp} label="Approval Rate" value={`${approvalRate}%`} sub={`${approvedCr} of ${totalCr} requests`} colorClass="bg-amber-500/10 text-amber-500" />
            </div>
          )}
        </section>

        {/* Approval statistics */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/90 backdrop-blur">
            <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-xl">Approval Statistics</CardTitle>
                <CardDescription>{totalCr} change requests total</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportApprovalsCsv} disabled={status !== "ready" || totalCr === 0}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {status === "loading" ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                </div>
              ) : totalCr === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No change request data available yet.
                </div>
              ) : (
                <>
                  {/* Progress bars */}
                  {([
                    { label: "Pending", count: pendingCr, icon: Clock, color: "text-amber-500" },
                    { label: "Approved", count: approvedCr, icon: CheckCircle2, color: "text-emerald-500" },
                    { label: "Rejected", count: rejectedCr, icon: XCircle, color: "text-rose-500" },
                  ] as const).map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <item.icon className={`h-4 w-4 ${item.color}`} />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <span className="tabular-nums text-muted-foreground">
                          {item.count} ({totalCr > 0 ? Math.round((item.count / totalCr) * 100) : 0}%)
                        </span>
                      </div>
                      <Progress value={totalCr > 0 ? (item.count / totalCr) * 100 : 0} />
                    </div>
                  ))}

                  {/* Top requester */}
                  {topRequester && (
                    <div className="mt-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Most active requester: </span>
                      <span className="font-medium text-foreground">{topRequester[0]}</span>
                      <span className="text-muted-foreground"> ({topRequester[1]} requests)</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* User activity / role breakdown */}
          {canViewUsers && (
            <Card className="border-border/60 bg-card/90 backdrop-blur">
              <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="text-xl">User Activity</CardTitle>
                  <CardDescription>{users.length} registered users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportUsersCsv} disabled={status !== "ready" || users.length === 0}>
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {status === "loading" ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                  </div>
                ) : users.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No user data available.
                  </div>
                ) : (
                  <>
                    {/* Active vs inactive */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Active users</span>
                        <span className="tabular-nums text-muted-foreground">
                          {activeUsers} of {users.length}
                        </span>
                      </div>
                      <Progress value={users.length > 0 ? (activeUsers / users.length) * 100 : 0} />
                    </div>

                    {/* Role breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role Distribution</p>
                      {roleBreakdown.map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-2.5 text-sm">
                          <span className="font-medium capitalize">{role}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Data usage — category table */}
        <section>
          <Card className="border-border/60 bg-card/90 backdrop-blur">
            <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-xl">System Usage — Data Categories</CardTitle>
                <CardDescription>Document counts and field schema per category</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportCategoriesCsv} disabled={status !== "ready" || categoryRows.length === 0}>
                <Download className="h-4 w-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              {status === "loading" ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : categoryRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center text-sm text-muted-foreground">
                  <Database className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  No data categories exist yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Documents</TableHead>
                      <TableHead className="text-right">Fields</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRows.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium capitalize">{cat.category}</TableCell>
                        <TableCell className="text-right tabular-nums">{cat.document_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{cat.fields.length}</TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {totalDocuments > 0 ? `${Math.round((cat.document_count / totalDocuments) * 100)}%` : "0%"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Export section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Download Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canViewUsers && (
              <Card className="border-border/60 bg-card/90 backdrop-blur">
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="font-medium">User Report</p>
                  <p className="text-xs text-muted-foreground">All users with roles and status</p>
                  <Button size="sm" variant="outline" onClick={exportUsersCsv} disabled={status !== "ready"}>
                    <Download className="h-4 w-4" /> Download CSV
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 bg-card/90 backdrop-blur">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <p className="font-medium">Approval Report</p>
                <p className="text-xs text-muted-foreground">All change requests with status</p>
                <Button size="sm" variant="outline" onClick={exportApprovalsCsv} disabled={status !== "ready"}>
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 backdrop-blur">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                  <Database className="h-6 w-6" />
                </div>
                <p className="font-medium">Categories Report</p>
                <p className="text-xs text-muted-foreground">Category sizes and field schemas</p>
                <Button size="sm" variant="outline" onClick={exportCategoriesCsv} disabled={status !== "ready"}>
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/90 backdrop-blur opacity-60 cursor-not-allowed">
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="font-medium text-muted-foreground">PDF Reports</p>
                <p className="text-xs text-muted-foreground">Coming soon — server-side PDF generation</p>
                <Button size="sm" variant="outline" disabled>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}
