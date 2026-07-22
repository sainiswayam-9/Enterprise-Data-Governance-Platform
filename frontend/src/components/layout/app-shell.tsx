"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { NAVIGATION_ITEMS } from "@/lib/navigation";

function resolvePageMeta(pathname: string) {
  const normalized = pathname === "/" ? "/dashboard" : pathname;
  const match = NAVIGATION_ITEMS.find((item) => normalized === item.href || normalized.startsWith(`${item.href}/`));

  return {
    title: match?.label ?? "Dashboard",
    subtitle: match?.description ?? "Operational overview and secure workspace controls.",
  };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageMeta = useMemo(() => resolvePageMeta(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-background xl:pl-80">
      <Sidebar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
      <div className="flex min-h-screen flex-col">
        <Navbar title={pageMeta.title} subtitle={pageMeta.subtitle} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl animate-slide-up">
            {status === "loading" ? (
              <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-border/60 bg-card/70 backdrop-blur">
                <Spinner label="Restoring secure session" />
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
