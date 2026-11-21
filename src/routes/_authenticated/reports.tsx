import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, StatusBadge, td, th } from "@/components/fleet/common";
import { useDB } from "@/lib/store";
import {
  complianceItems,
  expiryStatus,
  exportCSV,
  fmtDate,
  fmtMoney,
  liveVehicles,
  vehicleView,
} from "@/lib/fleet";
import type { DB } from "@/lib/types";

const REPORTS = {
  master: "Vehicle Master Report",
  owner: "Vehicles by Owner",
  driver: "Vehicles by Driver",
  project: "Vehicles by Project",
  maintenance: "Maintenance Report",
  compliance: "Compliance Report",
  history: "Vehicle Assignment History",
} as const;
type R = keyof typeof REPORTS;
type Row = Record<string, string | number>;

export const Route = createFileRoute("/_authenticated/reports")({
  validateSearch: (s: Record<string, unknown>): { r?: R } => ({
    r: typeof s.r === "string" && s.r in REPORTS ? (s.r as R) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reports — Vehicle Management CMS" },
      {
        name: "description",
        content: "Vehicle, maintenance, compliance and assignment reports with CSV export.",
      },
      { property: "og:title", content: "Reports" },
      { property: "og:description", content: "Fleet reports." },
    ],
  }),
  component: Page,
});

function build(db: DB, r: R): { rows: Row[]; group?: string; filterKey?: string } {
  const vs = liveVehicles(db).map((v) => vehicleView(db, v));
  const warn = db.company.expiryWarningDays;
  const base = (v: (typeof vs)[number]): Row => ({
    "Vehicle ID": v.id,
    Vehicle: v.name,
    Plate: v.plate ?? "",
    Owner: v.ownerName,
    Driver: v.driverName,
    Project: v.projectName,
    Location: v.currentLocation,
    Status: v.status,
  });
  switch (r) {
    case "master":
      return {
        rows: vs.map((v) => ({
          ...base(v),
          "Asset ID": v.assetId ?? "",
          Make: v.make,
          Model: v.model,
          Year: v.year ?? "",
          VIN: v.vin ?? "",
          Ownership: v.ownershipType,
          Mileage: v.mileage ?? 0,
        })),
        filterKey: "Status",
      };
    case "owner":
      return {
        rows: vs.map(base).sort((a, b) => String(a.Owner).localeCompare(String(b.Owner))),
        group: "Owner",
        filterKey: "Owner",
      };
    case "driver":
      return {
        rows: vs.map(base).sort((a, b) => String(a.Driver).localeCompare(String(b.Driver))),
        group: "Driver",
        filterKey: "Driver",
      };
    case "project":
      return {
        rows: vs.map(base).sort((a, b) => String(a.Project).localeCompare(String(b.Project))),
        group: "Project",
        filterKey: "Project",
      };
    case "maintenance":
      return {
        rows: db.maintenance
          .filter((m) => !m.deleted)
          .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
          .map((m) => ({
            ID: m.id,
            "Vehicle ID": m.vehicleId,
            Date: m.serviceDate,
            Type: m.serviceType,
            Mileage: m.mileage ?? "",
            Cost: m.cost ?? 0,
            Vendor: m.vendor ?? "",
            "Next Service": m.nextServiceDate ?? "",
            Status: m.status,
          })),
        filterKey: "Type",
      };
    case "compliance":
      return {
        rows: vs.flatMap((v) =>
          complianceItems(v).map((c) => ({
            "Vehicle ID": v.id,
            Vehicle: v.name,
            Item: c.label,
            Reference: c.ref ?? "",
            Expiry: c.date ?? "",
            Status: expiryStatus(c.date, warn),
          })),
        ),
        filterKey: "Status",
      };
    case "history":
      return {
        rows: db.assignments
          .sort((a, b) => b.startDate.localeCompare(a.startDate))
          .map((a) => ({
            "Vehicle ID": a.vehicleId,
            Project: db.projects.find((p) => p.id === a.projectId)?.name ?? "",
            Driver: db.drivers.find((d) => d.id === a.driverId)?.name ?? "",
            Supervisor: a.supervisor ?? "",
            Location: a.location ?? "",
            Start: a.startDate,
            End: a.endDate ?? "",
            Status: a.active ? "Active" : "Completed",
          })),
        filterKey: "Status",
      };
  }
}

function Page() {
  const db = useDB();
  const { r = "master" } = Route.useSearch();
  const nav = useNavigate({ from: "/reports" });
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const data = useMemo(() => build(db, r), [db, r]);
  const opts = data.filterKey
    ? [...new Set(data.rows.map((x) => String(x[data.filterKey!])).filter(Boolean))].sort()
    : [];
  const rows = data.rows.filter(
    (x) =>
      (f === "all" || String(x[data.filterKey!]) === f) &&
      (!q || Object.values(x).some((v) => String(v).toLowerCase().includes(q.toLowerCase()))),
  );
  const cols = data.rows[0] ? Object.keys(data.rows[0]) : [];
  const fmt = (k: string, v: string | number) =>
    k === "Status" ? (
      <StatusBadge status={String(v)} />
    ) : k === "Cost" ? (
      fmtMoney(Number(v))
    ) : /Date|Expiry|Start|End|Next Service/.test(k) && v ? (
      fmtDate(String(v))
    ) : k === "Vehicle ID" ? (
      <span className="font-mono text-xs">{v}</span>
    ) : (
      String(v || "—")
    );

  return (
    <div>
      <PageHeader title="Reports" subtitle="Filter, search and export fleet data as CSV" />
      <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
        <Panel>
          <ul className="p-2">
            {(Object.keys(REPORTS) as R[]).map((k) => (
              <li key={k}>
                <button
                  onClick={() => {
                    setF("all");
                    setQ("");
                    nav({ search: { r: k } });
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${k === r ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted"}`}
                >
                  {REPORTS[k]}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title={REPORTS[r]}
          action={
            <Button
              size="sm"
              variant="outline"
              disabled={!rows.length}
              onClick={() => exportCSV(`${r}-report.csv`, rows)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2 border-b p-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search report…"
                className="h-9 pl-8"
              />
            </div>
            {data.filterKey && (
              <Select value={f} onValueChange={setF}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {data.filterKey}</SelectItem>
                  {opts.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((x, i) => {
                  const newGroup =
                    data.group && (i === 0 || rows[i - 1][data.group] !== x[data.group]);
                  return [
                    newGroup && (
                      <tr key={`g${i}`} className="bg-accent/60">
                        <td
                          colSpan={cols.length}
                          className="px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                        >
                          {x[data.group!] || "Unassigned"} ·{" "}
                          {rows.filter((y) => y[data.group!] === x[data.group!]).length}
                        </td>
                      </tr>
                    ),
                    <tr key={i} className="hover:bg-muted/40">
                      {cols.map((c) => (
                        <td key={c} className={td}>
                          {fmt(c, x[c])}
                        </td>
                      ))}
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
            {!rows.length && <EmptyState title="No rows" />}
          </div>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">{rows.length} rows</div>
        </Panel>
      </div>
    </div>
  );
}
