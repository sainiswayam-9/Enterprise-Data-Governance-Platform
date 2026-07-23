"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, MoonStar, SunMedium } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/backend";
import type { AppRole } from "@/types/auth";

interface NavbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const roleLabels: Record<AppRole, string> = {
  manager: "Manager",
  hr: "HR",
  salesperson: "Salesperson",
};

export function Navbar({ title, subtitle, onMenuClick }: NavbarProps) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{APP_NAME}</p>
          <h1 className="truncate font-display text-2xl font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {user ? <Badge variant="secondary" className="rounded-full px-3 py-1">{roleLabels[user.role]}</Badge> : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            disabled={!mounted || status === "loading"}
          >
            {mounted && theme === "dark" ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 gap-3 rounded-full px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.username
                      ? user.username
                          .split("_")
                          .map((part) => part.charAt(0))
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "RB"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <div className="text-sm font-semibold leading-none">{user?.username ?? "Loading profile"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{user?.email ?? "Session sync in progress"}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{user?.username ?? "Workspace user"}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user?.role ? roleLabels[user.role] : "Authenticated session"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Bell className="mr-2 h-4 w-4" />
                Notifications coming soon
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/logout") }>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
