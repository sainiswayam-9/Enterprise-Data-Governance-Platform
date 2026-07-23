"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  Edit2,
  PlusCircle,
  RefreshCcw,
  Search,
  Shield,
  ShieldOff,
  Users,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

import { RoleGuard } from "@/components/auth/role-guard";
import { PermissionButton } from "@/components/auth/permission-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { userService } from "@/services/user.service";
import type { AuthUser } from "@/types/auth";
import type { CreateUserRequest, UpdateUserRequest, Role } from "@/types/models";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "username" | "email" | "role" | "is_active";
type SortDir = "asc" | "desc";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLES: Role[] = ["manager", "hr", "salesperson"];
const ROLE_LABELS: Record<Role, string> = {
  manager: "Manager",
  hr: "HR",
  salesperson: "Salesperson",
};

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "manager"
      ? "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400"
      : role === "hr"
      ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
      : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" />;
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="ml-1 inline h-3.5 w-3.5" />
  );
}

// ── Create/Edit Form ──────────────────────────────────────────────────────────

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
  editTarget: AuthUser | null;
}

function UserFormDialog({ open, onClose, onSaved, editTarget }: UserFormProps) {
  const isEdit = editTarget !== null;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ username: string; email: string; password: string; role: Role }>({
    username: "",
    email: "",
    password: "",
    role: "salesperson",
  });

  // Populate on edit
  useEffect(() => {
    if (editTarget) {
      setForm({
        username: editTarget.username,
        email: editTarget.email,
        password: "",
        role: editTarget.role,
      });
    } else {
      setForm({ username: "", email: "", password: "", role: "salesperson" });
    }
  }, [editTarget, open]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let saved: AuthUser;
      if (isEdit && editTarget) {
        const payload: UpdateUserRequest = { email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        saved = await userService.update(editTarget.id, payload);
        toast.success(`${saved.username} updated.`);
      } else {
        const payload: CreateUserRequest = {
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        saved = await userService.create(payload);
        toast.success(`User "${saved.username}" created.`);
      }
      onSaved(saved);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the user's details and role." : "Fill in the details to add a new user."}
          </DialogDescription>
        </DialogHeader>
        <form id="user-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <Input
                id="username"
                name="username"
                placeholder="e.g. john_doe"
                required
                value={form.username}
                onChange={handleChange}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@company.com"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {isEdit ? "New Password (leave blank to keep)" : "Password"}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={isEdit ? "Leave blank to keep current" : "Min. 8 characters"}
              required={!isEdit}
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((prev) => ({ ...prev, role: v as Role }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button form="user-form" type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Toggle-Active Confirm Dialog ──────────────────────────────────────────────

interface ToggleConfirmProps {
  user: AuthUser | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ToggleConfirmDialog({ user, onClose, onConfirm }: ToggleConfirmProps) {
  const [loading, setLoading] = useState(false);
  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }
  return (
    <AlertDialog open={user !== null} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user?.is_active ? "Deactivate" : "Activate"} {user?.username}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.is_active
              ? "This user will no longer be able to log in."
              : "This user will be able to log in again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={loading} onClick={() => void handleConfirm()}>
            {loading ? "Processing…" : user?.is_active ? "Deactivate" : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("users:manage");

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<SortKey>("username");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AuthUser | null>(null);

  const loadUsers = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await userService.list();
      setUsers(data);
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load users.";
      setError(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Filter + sort + paginate
  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const q = search.toLowerCase();
      const matchQ =
        !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.is_active) ||
        (statusFilter === "inactive" && !u.is_active);
      return matchQ && matchRole && matchStatus;
    });

    list = [...list].sort((a, b) => {
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return list;
  }, [users, search, roleFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(u: AuthUser) {
    setEditTarget(u);
    setFormOpen(true);
  }

  function handleSaved(saved: AuthUser) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    try {
      const result = await userService.toggleActive(toggleTarget.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === toggleTarget.id ? { ...u, is_active: result.is_active } : u))
      );
      toast.success(result.message ?? `User ${result.is_active ? "activated" : "deactivated"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setToggleTarget(null);
    }
  }

  const ThCell = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => toggleSort(k)}
    >
      {label}
      <SortIcon active={sortKey === k} dir={sortDir} />
    </TableHead>
  );

  return (
    <RoleGuard allowedRoles={["manager", "hr"]}>
      <div className="space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-1 w-fit">User administration</Badge>
            <h1 className="text-3xl font-bold tracking-tight font-display">Users</h1>
            <p className="text-muted-foreground">{users.length} total accounts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={status === "loading"}>
              <RefreshCcw className={status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <PlusCircle className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by username or email…"
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as Role | "all"); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as "all" | "active" | "inactive"); setPage(1); }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/60 bg-card/90 backdrop-blur">
          <CardHeader className="pb-0">
            <CardTitle>
              {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
            </CardTitle>
            <CardDescription>Sorted by {sortKey} ({sortDir})</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {status === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : status === "error" ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                <p className="font-medium">Failed to load users.</p>
                <p className="mt-1 opacity-80">{error}</p>
                <Button className="mt-4" variant="outline" size="sm" onClick={() => void loadUsers()}>Retry</Button>
              </div>
            ) : pageUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No users found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search || roleFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters."
                    : "No users exist yet."}
                </p>
                {canManage && (
                  <Button className="mt-4" size="sm" onClick={openCreate}>
                    <PlusCircle className="h-4 w-4" /> Add User
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <ThCell k="username" label="Username" />
                    <ThCell k="email" label="Email" />
                    <ThCell k="role" label="Role" />
                    <ThCell k="is_active" label="Status" />
                    <TableHead>Created by</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "success" : "destructive"}>
                          {u.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.created_by ?? "—"}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(u)}
                              aria-label={`Edit ${u.username}`}
                              className="h-8 w-8"
                              disabled={u.id === currentUser?.id}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToggleTarget(u)}
                              aria-label={u.is_active ? `Deactivate ${u.username}` : `Activate ${u.username}`}
                              className="h-8 w-8"
                              disabled={u.id === currentUser?.id}
                            >
                              {u.is_active ? (
                                <ShieldOff className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {status === "ready" && filtered.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="flex items-center px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <PermissionButton permission="users:manage">
          <UserFormDialog
            open={formOpen}
            onClose={() => setFormOpen(false)}
            onSaved={handleSaved}
            editTarget={editTarget}
          />
        </PermissionButton>

        <ToggleConfirmDialog
          user={toggleTarget}
          onClose={() => setToggleTarget(null)}
          onConfirm={handleToggle}
        />
      </div>
    </RoleGuard>
  );
}
