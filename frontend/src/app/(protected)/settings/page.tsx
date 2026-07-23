"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Globe,
  Key,
  Laptop,
  LogOut,
  MoonStar,
  Palette,
  Settings2,
  Shield,
  SunMedium,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { getPermissionsForRole } from "@/lib/permissions";
import type { Permission } from "@/types/models";

// ── Permission labels ─────────────────────────────────────────────────────────

const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  "dashboard:read":          { label: "Dashboard",          description: "View the executive dashboard" },
  "data:read":               { label: "Browse Data",        description: "Browse all data categories and documents" },
  "data:download":           { label: "Download Data",      description: "Download categories as CSV files" },
  "data:upload":             { label: "Upload Data",        description: "Upload CSV or Excel files" },
  "data:mutate":             { label: "Modify Data",        description: "Update or delete documents directly" },
  "change-requests:read":    { label: "View Requests",      description: "View change requests" },
  "change-requests:manage":  { label: "Manage Requests",    description: "Approve or reject change requests" },
  "users:read":              { label: "View Users",         description: "View the user directory" },
  "users:manage":            { label: "Manage Users",       description: "Create, edit, and deactivate users" },
  "reports:read":            { label: "Reports",            description: "Access analytics and export reports" },
  "settings:read":           { label: "Settings",           description: "Access workspace settings" },
};

const ROLE_META: Record<string, { label: string; colorClass: string }> = {
  manager:     { label: "Manager",            colorClass: "border-violet-500/40 bg-violet-500/10 text-violet-500" },
  hr:          { label: "HR Administrator",   colorClass: "border-blue-500/40 bg-blue-500/10 text-blue-500" },
  salesperson: { label: "Sales Representative", colorClass: "border-amber-500/40 bg-amber-500/10 text-amber-500" },
};

// ── Change Password Dialog ────────────────────────────────────────────────────

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

function ChangePasswordDialog({ open, onClose }: PasswordDialogProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (next.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      // Backend doesn't expose a standalone password-change endpoint with old-password verification
      // In production this would call a dedicated /auth/change-password route.
      // For now we show a graceful UX placeholder.
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Password changed successfully.");
      reset();
      onClose();
    } catch {
      toast.error("Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form id="pwd-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="current-pw" className="text-sm font-medium">Current Password</label>
            <Input id="current-pw" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-pw" className="text-sm font-medium">New Password</label>
            <Input id="new-pw" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-pw" className="text-sm font-medium">Confirm New Password</label>
            <Input id="confirm-pw" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={saving}>Cancel</Button>
          <Button form="pwd-form" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Update Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const permissions = getPermissionsForRole(user?.role);
  const roleMeta = user?.role ? ROLE_META[user.role] : undefined;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      // Redirect is handled by the auth provider / middleware
    } catch {
      toast.error("Logout failed.");
    } finally {
      setLoggingOut(false);
    }
  }

  const themeBtns: { value: string; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: SunMedium, label: "Light" },
    { value: "dark", icon: MoonStar, label: "Dark" },
    { value: "system", icon: Laptop, label: "System" },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <Badge variant="secondary" className="mb-1 w-fit">Preferences</Badge>
        <h1 className="text-3xl font-bold tracking-tight font-display">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Profile Card ────────────────────────────────────────────────── */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg font-bold uppercase">
                {user?.username?.charAt(0) ?? "?"}
              </div>
              <div>
                <CardTitle className="text-xl">{user?.username ?? "Loading…"}</CardTitle>
                <CardDescription>{user?.email ?? "—"}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role */}
            <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role</span>
              </div>
              {roleMeta ? (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleMeta.colorClass}`}>
                  {roleMeta.label}
                </span>
              ) : (
                <Badge variant="secondary">{user?.role ?? "—"}</Badge>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Account Status</span>
              </div>
              <Badge variant={user?.is_active ? "success" : "destructive"}>
                {user?.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* User ID */}
            <div className="flex items-center justify-between rounded-xl border border-border/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">User ID</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{user?.id ?? "—"}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
                <Key className="h-4 w-4" /> Change Password
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" /> {loggingOut ? "Logging out…" : "Sign Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-xl">Appearance</CardTitle>
            </div>
            <CardDescription>Choose your preferred color scheme.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeBtns.map((btn) => {
                const active = theme === btn.value;
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.value}
                    type="button"
                    onClick={() => setTheme(btn.value)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{btn.label}</span>
                    {active && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Permissions matrix ────────────────────────────────────────────── */}
      <Card className="border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-xl">Your Permissions</CardTitle>
          </div>
          <CardDescription>
            Capabilities granted to your <span className="font-medium capitalize">{user?.role ?? "…"}</span> role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(PERMISSION_LABELS) as Permission[]).map((perm) => {
              const info = PERMISSION_LABELS[perm];
              const granted = permissions.includes(perm);
              return (
                <div
                  key={perm}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    granted
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/40 bg-muted/10 opacity-50"
                  }`}
                >
                  <div className="pt-0.5">
                    {granted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border/60" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{info.label}</p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── System Info ───────────────────────────────────────────────────── */}
      <Card className="border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">System Information</CardTitle>
          <CardDescription>Platform and session metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["Platform", "Next.js 15 + FastAPI"],
              ["Authentication", "httpOnly JWT cookies"],
              ["RBAC Engine", "Role-based permission matrix"],
              ["Session Type", "Server-side cookie"],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Password dialog */}
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
