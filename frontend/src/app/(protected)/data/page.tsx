"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Database,
  Download,
  FileUp,
  RefreshCcw,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { dataService, type ChangeRequestItem } from "@/services/data.service";
import type { CategoryOverview, DataDocument, PaginatedDataResponse } from "@/types/models";

const PAGE_SIZE = 20;
const PREDEFINED = ["salon", "supermarket", "restaurant", "pharmacy", "electronics", "others"];

// ── Upload dialog ─────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  categories: string[];
  onClose: () => void;
  onUploaded: () => void;
}

function UploadDialog({ open, categories, onClose, onUploaded }: UploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("salon");
  const [customCategory, setCustomCategory] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setCategory("salon");
    setCustomCategory("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) { toast.error("Select a file first."); return; }
    setUploading(true);
    try {
      const result = await dataService.uploadFile(file, category, category === "others" ? customCategory : undefined);
      toast.success(`Uploaded ${result.rows_added} rows to "${result.category}".`);
      reset();
      onUploaded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const allCats = [...new Set([...PREDEFINED, ...categories])];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Data File</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file. Data will be appended if the category already exists.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCats.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category === "others" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Custom category name</label>
              <Input
                placeholder="e.g. electronics_2024"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">File (CSV or Excel)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={uploading}>Cancel</Button>
          <Button onClick={() => void handleUpload()} disabled={uploading || !file}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Change-request submit dialog ──────────────────────────────────────────────

interface CrSubmitProps {
  open: boolean;
  doc: DataDocument | null;
  category: string;
  onClose: () => void;
  onSubmitted: () => void;
}

function SubmitCrDialog({ open, doc, category, onClose, onSubmitted }: CrSubmitProps) {
  const [action, setAction] = useState<"update" | "delete">("delete");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setAction("delete"); setReason(""); }
  }, [open]);

  async function handleSubmit() {
    if (!doc) return;
    setLoading(true);
    try {
      await dataService.submitChangeRequest({
        category,
        doc_id: doc.id,
        action,
        reason,
      });
      toast.success("Change request submitted.");
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Change Request</DialogTitle>
          <DialogDescription>Request a manager to modify or delete this record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Action</label>
            <Tabs value={action} onValueChange={(v) => setAction(v as "update" | "delete")}>
              <TabsList>
                <TabsTrigger value="delete">Delete</TabsTrigger>
                <TabsTrigger value="update">Update</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <Input
              placeholder="Describe why this change is needed…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Document ID: <span className="font-mono">{doc?.id}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || !reason.trim()}>
            {loading ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete-document confirm (manager) ─────────────────────────────────────────

interface DeleteDocProps {
  doc: DataDocument | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function DeleteDocDialog({ doc, onClose, onConfirm }: DeleteDocProps) {
  const [loading, setLoading] = useState(false);
  return (
    <AlertDialog open={doc !== null} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove document <span className="font-mono text-xs">{doc?.id}</span>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
          >
            {loading ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Document preview dialog ───────────────────────────────────────────────────

interface PreviewProps {
  doc: DataDocument | null;
  onClose: () => void;
}

function PreviewDialog({ doc, onClose }: PreviewProps) {
  if (!doc) return null;
  const entries = Object.entries(doc).filter(([k]) => k !== "id" && !["added_by", "added_by_role", "uploaded_at"].includes(k));
  return (
    <Dialog open={doc !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
          <DialogDescription className="font-mono text-xs">{doc.id}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-start gap-3 rounded-xl border border-border/40 px-4 py-2.5">
              <span className="w-1/3 shrink-0 text-xs font-medium text-muted-foreground capitalize">{k}</span>
              <span className="break-all text-sm text-foreground">{v === null || v === undefined ? "—" : String(v)}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DataPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("data:mutate");
  const canUpload = hasPermission("data:upload");
  const canDownload = hasPermission("data:download");
  const canRequestChange = !canManage && hasPermission("data:read");

  const [categories, setCategories] = useState<CategoryOverview[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [docs, setDocs] = useState<DataDocument[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [catStatus, setCatStatus] = useState<"loading" | "ready" | "error">("loading");
  const [docStatus, setDocStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DataDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DataDocument | null>(null);
  const [crDoc, setCrDoc] = useState<DataDocument | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));

  const loadCategories = useCallback(async () => {
    setCatStatus("loading");
    try {
      const data = await dataService.getOverview();
      setCategories(data.categories);
      setCatStatus("ready");
    } catch (err) {
      setCatStatus("error");
      toast.error(err instanceof Error ? err.message : "Failed to load categories.");
    }
  }, []);

  const loadDocuments = useCallback(
    async (cat: string, pg: number, q: string) => {
      setDocStatus("loading");
      try {
        let result: PaginatedDataResponse;
        if (q.trim()) {
          result = await dataService.searchCategory(cat, q.trim(), { page: pg, pageSize: PAGE_SIZE });
        } else {
          // Fetch via search with a wildcard-like empty search – backend /search requires q param
          // So we use a space/dot workaround. Actually the backend requires q always.
          // Use a broad regex search for "." which matches everything:
          result = await dataService.searchCategory(cat, ".", { page: pg, pageSize: PAGE_SIZE });
        }
        setDocs(result.data);
        setTotalDocs(result.total_found);
        setFields(result.data.length > 0 ? Object.keys(result.data[0]).filter((k) => k !== "id" && !["added_by", "added_by_role", "uploaded_at"].includes(k)) : []);
        setDocStatus("ready");
      } catch (err) {
        setDocStatus("error");
        toast.error(err instanceof Error ? err.message : "Failed to load documents.");
      }
    },
    []
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCat) {
      void loadDocuments(selectedCat, page, search);
    }
  }, [selectedCat, page, search, loadDocuments]);

  function selectCategory(cat: string) {
    setSelectedCat(cat);
    setPage(1);
    setSearch("");
    setSearchInput("");
    setDocs([]);
    setDocStatus("idle");
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  async function handleDeleteDoc() {
    if (!deleteDoc || !selectedCat) return;
    try {
      await dataService.deleteDocument(selectedCat, deleteDoc.id);
      toast.success("Document deleted.");
      setDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setTotalDocs((n) => n - 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteDoc(null);
    }
  }

  function handleDownload() {
    if (!selectedCat) return;
    const url = dataService.getDownloadUrl(selectedCat);
    window.open(url, "_blank");
  }

  const catNames = useMemo(() => categories.map((c) => c.category), [categories]);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-1 w-fit">Data Explorer</Badge>
          <h1 className="text-3xl font-bold tracking-tight font-display">Data</h1>
          <p className="text-muted-foreground">{categories.length} categories available</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { void loadCategories(); if (selectedCat) void loadDocuments(selectedCat, page, search); }}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          {canUpload && (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <FileUp className="h-4 w-4" /> Upload File
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Category sidebar */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          {catStatus === "loading" ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
            </div>
          ) : catStatus === "error" ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-sm text-destructive">
                <AlertCircle className="mb-1 h-4 w-4" />
                Failed to load categories.
                <Button size="sm" variant="outline" className="mt-2" onClick={() => void loadCategories()}>Retry</Button>
              </CardContent>
            </Card>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              <FolderOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No data uploaded yet.
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => selectCategory(cat.category)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  selectedCat === cat.category
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card/90 hover:bg-muted/30"
                }`}
              >
                <p className="font-medium capitalize">{cat.category}</p>
                <p className="text-xs text-muted-foreground">{cat.document_count.toLocaleString()} records</p>
              </button>
            ))
          )}
        </div>

        {/* Document table */}
        <div className="space-y-4">
          {!selectedCat ? (
            <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/90">
              <div className="text-center">
                <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-foreground">Select a category</p>
                <p className="mt-1 text-sm text-muted-foreground">Choose a category from the list to browse its data.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents…"
                    className="pl-9 pr-10"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
                  {canDownload && (
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  )}
                </div>
              </div>

              <Card className="border-border/60 bg-card/90 backdrop-blur">
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">{selectedCat}</CardTitle>
                      <CardDescription>
                        {docStatus === "ready"
                          ? `${totalDocs.toLocaleString()} document${totalDocs !== 1 ? "s" : ""}${search ? ` matching "${search}"` : ""}`
                          : "Loading…"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {docStatus === "loading" || docStatus === "idle" ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                    </div>
                  ) : docStatus === "error" ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                      Failed to load documents.
                      <Button size="sm" variant="outline" className="mt-2 ml-2" onClick={() => void loadDocuments(selectedCat, page, search)}>Retry</Button>
                    </div>
                  ) : docs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                      <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="font-medium">{search ? `No results for "${search}"` : "No documents found."}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {fields.slice(0, 5).map((f) => (
                              <TableHead key={f} className="capitalize">{f.replace(/_/g, " ")}</TableHead>
                            ))}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {docs.map((doc) => (
                            <TableRow key={doc.id} className="cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                              {fields.slice(0, 5).map((f) => (
                                <TableCell key={f} className="max-w-[160px] truncate text-sm">
                                  {doc[f] === null || doc[f] === undefined ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    String(doc[f])
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  {canManage ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteDoc(doc)}
                                      aria-label="Delete document"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : canRequestChange ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => setCrDoc(doc)}
                                    >
                                      Request change
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  {docStatus === "ready" && totalDocs > PAGE_SIZE && (
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Page {page} of {totalPages} ({totalDocs.toLocaleString()} total)
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UploadDialog
        open={uploadOpen}
        categories={catNames}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => void loadCategories()}
      />

      <PreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      <DeleteDocDialog
        doc={deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={handleDeleteDoc}
      />

      <SubmitCrDialog
        open={crDoc !== null}
        doc={crDoc}
        category={selectedCat ?? ""}
        onClose={() => setCrDoc(null)}
        onSubmitted={() => void loadDocuments(selectedCat!, page, search)}
      />
    </div>
  );
}
