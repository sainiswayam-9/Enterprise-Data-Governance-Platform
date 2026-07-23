"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { PermissionGuard } from "@/components/auth/permission-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dataService, type CategoriesResponse } from "@/services/data.service";

export default function DataPage() {
  const [data, setData] = useState<CategoriesResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await dataService.getCategories();
      setData(response);
      setStatus("ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load categories.";
      setErrorMessage(message);
      setStatus("error");
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return (
    <PermissionGuard permission="data:read">
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <Badge variant="secondary" className="w-fit">Data service</Badge>
              <CardTitle className="mt-2 text-3xl">Data Explorer</CardTitle>
              <CardDescription className="text-base">Real category metadata returned by the backend.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => void loadCategories()} aria-label="Refresh categories">
              <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-2xl" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Failed to load category metadata.</p>
                <p className="mt-1 text-destructive/80">{errorMessage ?? "Please retry the request."}</p>
                <Button className="mt-4" variant="outline" onClick={() => void loadCategories()}>
                  Retry
                </Button>
              </div>
            ) : !data?.all.length ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                No categories are available yet.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Predefined", value: data.predefined.length },
                    { label: "Existing", value: data.existing.length },
                    { label: "All", value: data.all.length },
                  ].map((item) => (
                    <Card key={item.label} className="border-border/60 bg-muted/20">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-3xl font-semibold text-foreground">{item.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {data.all.map((item) => (
                    <Badge key={item} variant="secondary" className="rounded-full px-3 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  {data.note}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Operational summary</CardTitle>
            <CardDescription>How the data API is being consumed</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Source
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">FastAPI data_service</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Transport
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">Same-origin proxy with JWT cookie auth</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
