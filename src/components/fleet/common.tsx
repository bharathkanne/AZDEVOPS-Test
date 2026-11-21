import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
import { Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const tone: Record<string, string> = {
  green: "bg-success/12 text-success ring-success/25",
  orange: "bg-warning/15 text-warning-foreground ring-warning/35",
  red: "bg-destructive/10 text-destructive ring-destructive/25",
  gray: "bg-muted text-muted-foreground ring-border",
  blue: "bg-chart-5/10 text-chart-5 ring-chart-5/25",
};
const map: Record<string, keyof typeof tone> = {
  Active: "green",
  Valid: "green",
  Completed: "green",
  Idle: "orange",
  "Expiring Soon": "orange",
  Maintenance: "orange",
  "In Progress": "orange",
  "On Hold": "orange",
  "Maintenance Due": "orange",
  "Under Repair": "red",
  Expired: "red",
  Cancelled: "red",
  Disposed: "red",
  Inactive: "gray",
  "N/A": "gray",
  "In Storage": "gray",
  New: "blue",
  Scheduled: "blue",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tone[map[status] ?? "gray"],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export function EmptyState({
  title = "No records found",
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">
        {value === undefined || value === null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

export function SortHead({
  label,
  k,
  sort,
  setSort,
}: {
  label: string;
  k: string;
  sort: { k: string; dir: 1 | -1 };
  setSort: (s: { k: string; dir: 1 | -1 }) => void;
}) {
  const active = sort.k === k;
  const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => setSort({ k, dir: active ? ((sort.dir * -1) as 1 | -1) : 1 })}
    >
      {label} <Icon className="h-3 w-3" />
    </button>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ title: string; desc: string; onOk: () => void } | null>(
    null,
  );
  const node = (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && setState(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              state?.onOk();
              setState(null);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return {
    confirm: (title: string, desc: string, onOk: () => void) => setState({ title, desc, onOk }),
    node,
  };
}

export function Pager({
  page,
  pages,
  total,
  setPage,
}: {
  page: number;
  pages: number;
  total: number;
  setPage: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
      <span>
        {total} record{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="rounded-md border bg-card px-2.5 py-1 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-2">
          Page {page} of {Math.max(pages, 1)}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
          className="rounded-md border bg-card px-2.5 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export const th =
  "px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap";
export const td = "px-3 py-2.5 whitespace-nowrap";
