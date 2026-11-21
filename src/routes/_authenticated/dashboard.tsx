import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Truck,
  CheckCircle2,
  Wrench,
  PauseCircle,
  UserX,
  FileWarning,
  ShieldAlert,
  CalendarClock,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useDB } from "@/lib/store";
import {
  activeAssignment,
  complianceItems,
  daysUntil,
  expiryStatus,
  fmtDate,
  liveVehicles,
  maintenanceSummary,
  vehicleView,
} from "@/lib/fleet";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/fleet/common";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vehicle Management CMS" },
      {
        name: "description",
        content: "Fleet overview: status, ownership, compliance and maintenance.",
      },
      { property: "og:title", content: "Dashboard — Vehicle Management CMS" },
      { property: "og:description", content: "Fleet overview." },
    ],
  }),
  component: Dashboard,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Dashboard() {
  const db = useDB();
  const s = useMemo(() => {
    const vs = liveVehicles(db);
    const warn = db.company.expiryWarningDays;
    const by = (st: string) => vs.filter((v) => v.status === st).length;
    const unassigned = vs.filter((v) => !activeAssignment(db, v.id)).length;
    const regExp = vs.filter((v) => expiryStatus(v.regExpiry, warn) !== "Valid").length;
    const insExp = vs.filter((v) => expiryStatus(v.insExpiry, warn) !== "Valid").length;
    const maint = vs.map((v) => ({ v, m: maintenanceSummary(db, v.id) }));
    const due = maint
      .filter((x) => x.m.next && (daysUntil(x.m.next) ?? 99) <= 14)
      .sort((a, b) => a.m.next!.localeCompare(b.m.next!));
    const alerts = vs
      .flatMap((v) => complianceItems(v).map((c) => ({ v, ...c, st: expiryStatus(c.date, warn) })))
      .filter((a) => a.st === "Expired" || a.st === "Expiring Soon")
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const projects = db.projects
      .filter((p) => !p.deleted)
      .map((p) => ({
        name: p.id,
        full: p.name,
        count: db.assignments.filter(
          (a) => a.active && a.projectId === p.id && vs.some((v) => v.id === a.vehicleId),
        ).length,
      }))
      .filter((p) => p.count > 0);
    return {
      total: vs.length,
      active: by("Active"),
      repair: by("Under Repair"),
      idle: by("Idle"),
      unassigned,
      regExp,
      insExp,
      maintDue: due.filter((x) => (daysUntil(x.m.next) ?? 0) < 0).length,
      status: [
        { name: "Active", value: by("Active") },
        { name: "Idle", value: by("Idle") },
        { name: "Repair", value: by("Under Repair") + by("Maintenance") },
        { name: "Inactive", value: by("Inactive") },
      ],
      own: (["Company Owned", "Leased", "Rented"] as const).map((o) => ({
        name: o,
        value: vs.filter((v) => v.ownershipType === o).length,
      })),
      projects,
      due,
      alerts,
      recent: [...vs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    };
  }, [db]);

  const kpis = [
    { label: "Total Vehicles", v: s.total, icon: Truck, search: {} },
    {
      label: "Active Vehicles",
      v: s.active,
      icon: CheckCircle2,
      search: { status: "Active" },
      tone: "text-success",
    },
    {
      label: "Under Repair",
      v: s.repair,
      icon: Wrench,
      search: { status: "Under Repair" },
      tone: "text-destructive",
    },
    {
      label: "Idle Vehicles",
      v: s.idle,
      icon: PauseCircle,
      search: { status: "Idle" },
      tone: "text-warning",
    },
    { label: "Unassigned", v: s.unassigned, icon: UserX, search: { flag: "unassigned" } },
  ];
  const kpis2 = [
    { label: "Registration Expiring", v: s.regExp, icon: FileWarning, search: { flag: "reg" } },
    { label: "Insurance Expiring", v: s.insExp, icon: ShieldAlert, search: { flag: "ins" } },
    { label: "Maintenance Due", v: s.maintDue, icon: CalendarClock, search: { flag: "maint" } },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fleet Dashboard"
        subtitle="Live overview calculated from your vehicle records."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to="/vehicles"
            search={k.search}
            className="group rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/50 hover:shadow"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              {k.label}
              <k.icon className={`h-4 w-4 ${k.tone ?? "text-primary"}`} />
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{k.v}</div>
            <div className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
              View list →
            </div>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis2.map((k) => (
          <Link
            key={k.label}
            to="/vehicles"
            search={k.search}
            className="flex items-center gap-3 rounded-xl border border-l-4 border-l-warning bg-card p-4 shadow-sm hover:shadow"
          >
            <k.icon className="h-5 w-5 text-warning" />
            <div className="flex-1 text-sm font-medium">{k.label}</div>
            <div className="text-2xl font-semibold tabular-nums">{k.v}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Vehicle Status Overview">
          <Donut data={s.status} />
        </Panel>
        <Panel title="Ownership Overview">
          <Donut data={s.own} />
        </Panel>
        <Panel title="Vehicles by Project">
          <div className="h-56 p-3">
            {s.projects.length ? (
              <ResponsiveContainer>
                <BarChart data={s.projects}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} width={24} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [v, "Vehicles"]}
                    labelFormatter={(l) => s.projects.find((p) => p.name === l)?.full ?? l}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No active assignments" />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Maintenance Due"
          action={
            <Link to="/maintenance" className="text-xs text-primary hover:underline">
              All maintenance
            </Link>
          }
        >
          <ul className="divide-y">
            {s.due.slice(0, 6).map(({ v, m }) => (
              <li key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link to="/vehicles/$id" params={{ id: v.id }} className="hover:text-primary">
                  <span className="font-mono text-xs text-muted-foreground">{v.id}</span> {v.name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fmtDate(m.next)}
                  <StatusBadge
                    status={(daysUntil(m.next) ?? 0) < 0 ? "Maintenance Due" : "Scheduled"}
                  />
                </div>
              </li>
            ))}
            {!s.due.length && <EmptyState title="Nothing due in the next 14 days" />}
          </ul>
        </Panel>
        <Panel
          title="Compliance Alerts"
          action={
            <Link
              to="/reports"
              search={{ r: "compliance" }}
              className="text-xs text-primary hover:underline"
            >
              Compliance report
            </Link>
          }
        >
          <ul className="max-h-72 divide-y overflow-y-auto">
            {s.alerts.map((a, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link
                  to="/vehicles/$id"
                  params={{ id: a.v.id }}
                  search={{ tab: "compliance" }}
                  className="hover:text-primary"
                >
                  <span className="font-mono text-xs text-muted-foreground">{a.v.id}</span>{" "}
                  {a.label}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fmtDate(a.date)}
                  <StatusBadge status={a.st} />
                </div>
              </li>
            ))}
            {!s.alerts.length && <EmptyState title="All compliance items are valid" />}
          </ul>
        </Panel>
        <Panel title="Recently Added Vehicles">
          <ul className="divide-y">
            {s.recent.map((v) => {
              const vv = vehicleView(db, v);
              return (
                <li key={v.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <Link to="/vehicles/$id" params={{ id: v.id }} className="hover:text-primary">
                    <span className="font-mono text-xs text-muted-foreground">{v.id}</span> {v.name}
                    <span className="ml-2 text-xs text-muted-foreground">{vv.projectName}</span>
                  </Link>
                  <StatusBadge status={v.status} />
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Recent Activity">
          <ul className="max-h-72 divide-y overflow-y-auto">
            {db.activity.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{a.user}</span> {a.action}
                  <div className="text-xs text-muted-foreground">{a.module}</div>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(a.at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
            {!db.activity.length && <EmptyState title="No activity yet" />}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{total}</span>
          <span className="text-[10px] uppercase text-muted-foreground">Vehicles</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i] }} />
              {d.name}
            </span>
            <span className="font-medium tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
