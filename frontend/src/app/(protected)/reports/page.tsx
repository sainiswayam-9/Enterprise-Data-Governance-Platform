"use client";

import { BarChart3, ShieldCheck } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <RoleGuard allowedRoles={["manager", "hr"]}>
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Analytics</Badge>
            <CardTitle className="mt-2 text-3xl">Reports</CardTitle>
            <CardDescription className="text-base">Reserved for management and HR workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Status
              </div>
              <p className="mt-2 text-sm text-foreground">Reporting surfaces will be added here in the next phase.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Access
              </div>
              <p className="mt-2 text-sm text-foreground">Protected by role and permission checks at the route level.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
