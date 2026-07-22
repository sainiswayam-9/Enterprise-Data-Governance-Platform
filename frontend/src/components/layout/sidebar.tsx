"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  LayoutDashboard,
  Settings2,
  SquarePen,
  Users,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/backend";
import { getVisibleNavigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/auth";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const iconMap = {
  "layout-dashboard": LayoutDashboard,
  database: Database,
  "square-pen": SquarePen,
  users: Users,
  "bar-chart-3": BarChart3,
  "settings-2": Settings2,
};

const roleLabels: Record<AppRole, string> = {
  manager: "Manager",
  hr: "HR",
  salesperson: "Salesperson",
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = getVisibleNavigationItems(user?.role ?? null);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-foreground">{APP_NAME}</p>
            <p className="text-sm text-muted-foreground">Enterprise RBAC dashboard</p>
          </div>
        </div>
        <Card className="border-border/60 bg-muted/40 shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active profile</p>
                <p className="mt-1 font-medium text-foreground">{user?.username ?? "Loading session"}</p>
              </div>
              {user?.role ? <Badge variant="secondary">{roleLabels[user.role]}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {user?.email ?? "Your dashboard will unlock once the backend session is restored."}
            </p>
          </CardContent>
        </Card>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = iconMap[item.iconKey as keyof typeof iconMap];
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              variant={active ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3 rounded-2xl px-4 py-6 text-left", active && "shadow-sm")}
              asChild
              onClick={onNavigate}
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="space-y-4">
        <Separator />
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 to-accent/30 p-4">
          <p className="text-sm font-semibold text-foreground">Security-first shell</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The JWT is stored in an httpOnly cookie and every protected view is validated on the server.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  return (
    <>
      <aside className="hidden border-r border-border/70 bg-background/95 px-5 py-6 backdrop-blur xl:fixed xl:inset-y-0 xl:left-0 xl:flex xl:w-80 xl:flex-col">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[min(88vw,20rem)] px-5 py-6">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Primary application navigation</SheetDescription>
          </SheetHeader>
          <SidebarContent onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
