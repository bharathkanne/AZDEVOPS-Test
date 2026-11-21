import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, Pager, Panel, SortHead, td, th, useConfirm } from "./common";
import { can, useSession } from "@/lib/store";
import { exportCSV } from "@/lib/fleet";

export interface Col<T> {
  key: string;
  label: string;
  render?: (r: T) => ReactNode;
  sortable?: boolean;
  value?: (r: T) => string | number;
}
export interface FormField {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "email" | "file";
  options?: { value: string; label: string }[];
  required?: boolean;
  full?: boolean;
}

interface Props<T extends { id: string }> {
  title: string;
  subtitle?: string;
  singular: string;
  rows: T[];
  columns: Col<T>[];
  fields: FormField[];
  newId: () => string;
  defaults?: Partial<T>;
  onSave: (row: T, isNew: boolean) => string | void; // return error string
  onDelete: (row: T) => void;
  detail?: (r: T) => ReactNode; // link wrapper for id
  filter?: { key: string; label: string; options: string[] };
  initialFilter?: string;
  initialQuery?: string;
}

export function EntityPage<T extends { id: string }>(p: Props<T>) {
  const session = useSession();
  const writable = can(session?.role, "write");
  const [q, setQ] = useState(p.initialQuery ?? "");
  const [f, setF] = useState(p.initialFilter ?? "all");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: "id", dir: 1 });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<{ row: Record<string, unknown>; isNew: boolean } | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { confirm, node } = useConfirm();
  const size = 10;

  const val = (r: T, c: Col<T>) =>
    c.value ? c.value(r) : (((r as Record<string, unknown>)[c.key] as string | number) ?? "");
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    let out = p.rows.filter(
      (r) => !s || p.columns.some((c) => String(val(r, c)).toLowerCase().includes(s)),
    );
    if (p.filter && f !== "all")
      out = out.filter((r) => String((r as Record<string, unknown>)[p.filter!.key]) === f);
    const col = p.columns.find((c) => c.key === sort.k);
    if (col)
      out = [...out].sort((a, b) => {
        const x = val(a, col),
          y = val(b, col);
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y))) * sort.dir
        );
      });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.rows, q, f, sort]);
  const pages = Math.ceil(filtered.length / size);
  const cur = filtered.slice((page - 1) * size, page * size);

  const openNew = () => {
    setErrors({});
    setEditing({ row: { ...p.defaults, id: p.newId() }, isNew: true });
  };
  const save = () => {
    if (!editing) return;
    const errs: Record<string, string> = {};
    p.fields.forEach((fl) => {
      if (fl.required && !String(editing.row[fl.key] ?? "").trim())
        errs[fl.key] = `${fl.label} is required`;
    });
    if (editing.row.email && !/^\S+@\S+\.\S+$/.test(String(editing.row.email)))
      errs.email = "Enter a valid email";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const row = { ...editing.row } as Record<string, unknown>;
    p.fields.forEach((fl) => {
      if (fl.type === "number")
        row[fl.key] = row[fl.key] === "" || row[fl.key] == null ? undefined : Number(row[fl.key]);
    });
    const err = p.onSave(row as T, editing.isNew);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(`${p.singular} ${editing.isNew ? "created" : "updated"}`);
    setEditing(null);
  };
  const set = (k: string, v: unknown) =>
    setEditing((e) => (e ? { ...e, row: { ...e.row, [k]: v } } : e));

  return (
    <div>
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCSV(
                  `${p.title.toLowerCase()}.csv`,
                  filtered.map((r) =>
                    Object.fromEntries(p.columns.map((c) => [c.label, val(r, c)])),
                  ),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            {writable && (
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add {p.singular}
              </Button>
            )}
          </>
        }
      />
      <Panel>
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={`Search ${p.title.toLowerCase()}…`}
              className="h-9 pl-8"
            />
          </div>
          {p.filter && (
            <Select
              value={f}
              onValueChange={(v) => {
                setF(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {p.filter.label}</SelectItem>
                {p.filter.options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {p.columns.map((c) => (
                  <th key={c.key} className={th}>
                    {c.sortable !== false ? (
                      <SortHead label={c.label} k={c.key} sort={sort} setSort={setSort} />
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
                <th className={th + " text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cur.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  {p.columns.map((c, i) => (
                    <td key={c.key} className={td}>
                      {i === 0 && p.detail
                        ? p.detail(r)
                        : c.render
                          ? c.render(r)
                          : String(val(r, c) || "—")}
                    </td>
                  ))}
                  <td className={td + " text-right"}>
                    <div className="inline-flex gap-1">
                      {writable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit"
                          onClick={() => {
                            setErrors({});
                            setEditing({ row: { ...r }, isNew: false });
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {writable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete"
                          onClick={() =>
                            confirm(
                              `Delete ${p.singular.toLowerCase()} ${r.id}?`,
                              "The record will be archived and hidden from lists. This cannot be undone from the UI.",
                              () => {
                                p.onDelete(r);
                                toast.success(`${p.singular} deleted`);
                              },
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {!writable && <Eye className="m-2 h-4 w-4 text-muted-foreground" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cur.length && (
            <EmptyState
              hint={q || f !== "all" ? "Try adjusting your search or filter." : undefined}
            />
          )}
        </div>
        <Pager page={page} pages={pages} total={filtered.length} setPage={setPage} />
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.isNew ? `Add ${p.singular}` : `Edit ${p.singular} ${editing?.row.id}`}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              {p.fields.map((fl) => {
                const v = editing.row[fl.key];
                return (
                  <div
                    key={fl.key}
                    className={fl.full || fl.type === "textarea" ? "sm:col-span-2" : ""}
                  >
                    <Label className="mb-1.5 block text-xs">
                      {fl.label}
                      {fl.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {fl.type === "select" ? (
                      <Select
                        value={(v as string) || undefined}
                        onValueChange={(x) => set(fl.key, x === "__none" ? "" : x)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          {!fl.required && <SelectItem value="__none">— None —</SelectItem>}
                          {fl.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : fl.type === "textarea" ? (
                      <Textarea
                        value={(v as string) ?? ""}
                        onChange={(e) => set(fl.key, e.target.value)}
                        rows={3}
                      />
                    ) : fl.type === "file" ? (
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1_500_000) {
                              toast.error("File too large for local storage (max 1.5 MB)");
                              return;
                            }
                            const rd = new FileReader();
                            rd.onload = () =>
                              setEditing((ed) =>
                                ed
                                  ? {
                                      ...ed,
                                      row: {
                                        ...ed.row,
                                        fileName: file.name,
                                        fileData: rd.result as string,
                                        name: ed.row.name || file.name.replace(/\.[^.]+$/, ""),
                                      },
                                    }
                                  : ed,
                              );
                            rd.readAsDataURL(file);
                          }}
                        />
                        {editing.row.fileName ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {String(editing.row.fileName)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <Input
                        type={fl.type ?? "text"}
                        value={(v as string | number) ?? ""}
                        disabled={fl.key === "id" && !editing.isNew}
                        onChange={(e) => set(fl.key, e.target.value)}
                      />
                    )}
                    {errors[fl.key] && (
                      <p className="mt-1 text-xs text-destructive">{errors[fl.key]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {node}
    </div>
  );
}

export function IdLink({
  to,
  id,
}: {
  to: "/owners/$id" | "/drivers/$id" | "/projects/$id" | "/vehicles/$id";
  id: string;
}) {
  return (
    <Link
      to={to}
      params={{ id }}
      className="font-mono text-xs font-medium text-primary hover:underline"
    >
      {id}
    </Link>
  );
}
