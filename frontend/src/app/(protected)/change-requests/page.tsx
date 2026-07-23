"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  RefreshCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { dataService } from "@/services/data.service";
import type { ChangeRequest } from "@/types/models";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleString(); }
  catch { return dateStr; }
}

function statusColor(s: string) {
  switch (s) {
    case "approved": return "success";
    case "rejected": return "destructive";
    default: return "secondary";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "approved": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "rejected": return <XCircle className="h-4 w-4 text-rose-500" />;
    default: return <Clock className="h-4 w-4 text-amber-500" />;
  }
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

interface DetailDialogProps {
  item: ChangeRequest | null;
  canResolve: boolean;
  onClose: () => void;
  onResolve: (id: string, decision: "approved" | "rejected") => Promise<void>;
}

function DetailDialog({ item, canResolve, onClose, onResolve }: DetailDialogProps) {
  const [resolving, setResolving] = useState<"approved" | "rejected" | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<"approved" | "rejected" | null>(null);

  if (!item) return null;

  async function handleResolve(decision: "approved" | "rejected") {
    setResolving(decision);
    await onResolve(item!.id, decision);
    setResolving(null);
    setConfirmDecision(null);
    onClose();
  }

  const newDataEntries = item.new_data ? Object.entries(item.new_data) : [];

  return (
    <>
      <Dialog open={item !== null} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <StatusIcon status={item.status} />
              <DialogTitle>Change Request Details</DialogTitle>
            </div>
            <DialogDescription className="font-mono text-xs">{item.id}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {/* Status timeline */}
            <div className="rounded-2xl border border-border/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">Submitted by {item.requester}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
              </div>
              {item.resolved_at && (
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${item.status === "approved" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <div>
                    <p className="font-medium capitalize">{item.status} by {item.resolved_by}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.resolved_at)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Audit info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Category", item.category],
                ["Action", item.action],
                ["Document ID", item.doc_id],
                ["Status", item.status],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>

            {item.reason && (
              <div className="rounded-xl border border-border/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="mt-0.5">{item.reason}</p>
              </div>
            )}

            {newDataEntries.length > 0 && (
              <div className="rounded-xl border border-border/40 px-3 py-2">
                <p className="mb-2 text-xs text-muted-foreground">Requested Updates</p>
                <div className="space-y-1">
                  {newDataEntries.map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs">
                      <span className="font-medium text-muted-foreground capitalize w-1/3">{k}</span>
                      <span className="text-foreground">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canResolve && item.status === "pending" && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={resolving !== null}
                onClick={() => setConfirmDecision("rejected")}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={resolving !== null}
                onClick={() => setConfirmDecision("approved")}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={confirmDecision !== null} onOpenChange={(v) => !v && setConfirmDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">{confirmDecision} this request?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDecision === "approved"
                ? "The requested action will be applied to the document immediately."
                : "The change request will be marked as rejected. No data will be modified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolving !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resolving !== null}
              onClick={() => void handleResolve(confirmDecision!)}
              className={confirmDecision === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-destructive"}
            >
              {resolving ? "Processing…" : `Confirm ${confirmDecision}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface CrRowProps {
  item: ChangeRequest;
  onClick: () => void;
}

function CrRow({ item, onClick }: CrRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-border/40 px-4 py-3.5 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon status={item.status} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              <span className="capitalize">{item.action}</span> in{" "}
              <span className="text-primary capitalize">{item.category}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              by {item.requester} · {formatDate(item.created_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={statusColor(item.status) as "success" | "secondary" | "destructive"} className="capitalize">
            {item.status}
          </Badge>
        </div>
      </div>
      {item.reason && (
        <p className="mt-2 pl-7 text-xs text-muted-foreground italic line-clamp-1">"{item.reason}"</p>
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function ChangeRequestsPage() {
  const { user, hasPermission } = useAuth();
  const canResolve = hasPermission("change-requests:manage");
  const canView = hasPermission("change-requests:read");

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedItem, setSelectedItem] = useState<ChangeRequest | null>(null);

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = canResolve
        ? await dataService.getAllChangeRequests()
        : await dataService.getMyChangeRequests();
      setItems(data);
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load change requests.";
      setError(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, [canResolve]);

  useEffect(() => {
    if (canView) void loadRequests();
  }, [loadRequests, canView]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? items : items.filter((i) => i.status === filter);
    return [...list].sort((a, b) =>
      sortDir === "desc"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [items, filter, sortDir]);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      rejected: items.filter((i) => i.status === "rejected").length,
    }),
    [items]
  );

  async function handleResolve(id: string, decision: "approved" | "rejected") {
    try {
      await dataService.resolveChangeRequest(id, decision);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: decision,
                resolved_at: new Date().toISOString(),
                resolved_by: user?.username ?? "",
              }
            : item
        )
      );
      toast.success(`Request ${decision}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve request.");
    }
  }

  return (
    <RoleGuard allowedRoles={["manager", "salesperson"]}>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-1 w-fit">
              {canResolve ? "Manager view — all requests" : "My requests"}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight font-display">Change Requests</h1>
            <p className="text-muted-foreground">{items.length} total requests</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRequests()} disabled={status === "loading"}>
            <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid gap-3 sm:grid-cols-4">
          {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                filter === s
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-card/90 hover:bg-muted/20"
              }`}
            >
              <p className="text-2xl font-bold">{counts[s]}</p>
              <p className="text-xs font-medium capitalize text-muted-foreground">{s}</p>
            </button>
          ))}
        </div>

        {/* Filters bar */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            className="gap-1"
          >
            {sortDir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            {sortDir === "desc" ? "Newest first" : "Oldest first"}
          </Button>
        </div>

        {/* List */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle>
              {filtered.length} request{filtered.length !== 1 ? "s" : ""}
              {filter !== "all" && ` · ${filter}`}
            </CardTitle>
            <CardDescription>
              {canResolve ? "Click a request to view details or approve/reject." : "Click a request to view its details."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {status === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                <p className="font-medium">Failed to load requests.</p>
                <p className="mt-1 opacity-80">{error}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadRequests()}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium">No {filter !== "all" ? filter : ""} requests</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filter !== "all" ? "Try a different filter." : "No change requests have been submitted yet."}
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <CrRow key={item.id} item={item} onClick={() => setSelectedItem(item)} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Detail / resolve dialog */}
        <DetailDialog
          item={selectedItem}
          canResolve={canResolve}
          onClose={() => setSelectedItem(null)}
          onResolve={handleResolve}
        />
      </div>
    </RoleGuard>
  );
}
