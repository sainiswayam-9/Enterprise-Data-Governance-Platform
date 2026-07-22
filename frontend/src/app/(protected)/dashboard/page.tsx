"use client";

import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Users, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getVisibleNavigationItems } from "@/lib/navigation";

const summaryCards = [
  {
    icon: ShieldCheck,
    title: "Secure session",
    description: "JWT validation is handled server-side and the browser never sees the raw token.",
  },
  {
    icon: Database,
    title: "Backend ready",
    description: "All data requests can be proxied through same-origin Next routes without changing the API.",
  },
  {
    icon: Users,
    title: "RBAC aware",
    description: "Navigation and future pages can be filtered by manager, HR, and salesperson permissions.",
  },
  {
    icon: Zap,
    title: "Responsive shell",
    description: "Sidebar, navbar, dark mode, toasts, and loading states are already wired for production use.",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const items = getVisibleNavigationItems(user?.role ?? null);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-border/60 bg-card/90 shadow-glow backdrop-blur">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Live workspace</Badge>
            <CardTitle className="mt-2 text-3xl">
              Welcome{user?.username ? `, ${user.username}` : ""}.
            </CardTitle>
            <CardDescription className="text-base">
              The frontend foundation is ready. Add your data views, forms, and reports on top of this shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/data">
                Open data explorer <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/users">Review user access</Link>
            </Button>
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
          <CardHeader>
            <CardTitle className="text-xl">Available modules</CardTitle>
            <CardDescription>Filtered by your current role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.href} className="rounded-2xl border border-border/60 px-4 py-3">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Implementation notes</CardTitle>
            <CardDescription>What this foundation already includes</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              "Auth context",
              "Axios interceptors",
              "Protected routes",
              "Role-based redirects",
              "Dark mode",
              "Toast notifications",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm font-medium text-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
