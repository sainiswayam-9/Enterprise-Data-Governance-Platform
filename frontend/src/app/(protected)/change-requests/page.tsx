"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dataService, type ChangeRequestItem } from "@/services/data.service";
import { useAuth } from "@/hooks/use-auth";

export default function ChangeRequestsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ChangeRequestItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = user?.role === "manager" ? await dataService.getAllChangeRequests() : await dataService.getMyChangeRequests();
      setItems(response);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load change requests.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  return (
    <RoleGuard allowedRoles={["manager", "salesperson"]}>
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <Badge variant="secondary" className="w-fit">Workflow</Badge>
              <CardTitle className="mt-2 text-3xl">Change Requests</CardTitle>
              <CardDescription className="text-base">Salesperson requests and manager approvals.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void loadRequests()} aria-label="Refresh requests">
              <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Failed to load requests.</p>
                <p className="mt-1 text-destructive/80">{errorMessage ?? "Please retry the request."}</p>
                <Button className="mt-4" variant="outline" onClick={() => void loadRequests()}>
                  Retry
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                No requests were returned by the backend.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{item.category}</p>
                      <Badge variant="secondary">{item.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.action} for document {item.doc_id}
                    </p>
                    <p className="mt-2 text-sm text-foreground">{item.reason ?? "No reason provided."}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Workflow summary</CardTitle>
            <CardDescription>Visible actions are role-aware</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                Current mode
              </div>
              <p className="mt-2 text-sm text-foreground">{user?.role === "manager" ? "Manager review queue" : "Salesperson request history"}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Requests loaded</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{items.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
