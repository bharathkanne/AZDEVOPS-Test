import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import {
  EmptyState,
  Field,
  PageHeader,
  Panel,
  StatusBadge,
  td,
  th,
} from "@/components/fleet/common";
import { useDB } from "@/lib/store";
import { daysUntil, expiryStatus, fmtDate } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/drivers/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Driver ${params.id} — Fleet Ops` },
      { name: "description", content: "Driver details and assignment history." },
      { property: "og:title", content: `Driver ${params.id}` },
      { property: "og:description", content: "Driver details." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const db = useDB();
  const d = db.drivers.find((x) => x.id === id && !x.deleted);
  if (!d) return <EmptyState title="Driver not found" />;
  const hist = db.assignments
    .filter((a) => a.driverId === id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const cur = hist.find((a) => a.active);
  const veh = db.vehicles.find((v) => v.id === cur?.vehicleId);
  const proj = db.projects.find((p) => p.id === cur?.projectId);
  const st = expiryStatus(d.licenseExpiry, db.company.expiryWarningDays);
  const n = daysUntil(d.licenseExpiry);
  return (
    <div className="space-y-4">
      <PageHeader title={d.name} subtitle={d.id} actions={<StatusBadge status={d.status} />} />
      {(st === "Expired" || st === "Expiring Soon") && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${st === "Expired" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/50 bg-warning/15 text-warning-foreground"}`}
        >
          <AlertTriangle className="h-4 w-4" />
          License {st === "Expired" ? `expired ${-(n ?? 0)} days ago` : `expires in ${n} days`} (
          {fmtDate(d.licenseExpiry)}).
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Driver Information" className="lg:col-span-2">
          <dl className="grid gap-5 p-5 sm:grid-cols-3">
            <Field label="Phone" value={d.phone} />
            <Field label="Email" value={d.email} />
            <Field label="License Number" value={d.licenseNumber} />
            <Field label="License Type" value={d.licenseType} />
            <Field
              label="License Expiry"
              value={
                <span className="flex items-center gap-2">
                  {fmtDate(d.licenseExpiry)}
                  <StatusBadge status={st} />
                </span>
              }
            />
          </dl>
        </Panel>
        <Panel title="Current Assignment">
          <dl className="space-y-4 p-5">
            <Field
              label="Vehicle"
              value={
                veh && (
                  <Link
                    to="/vehicles/$id"
                    params={{ id: veh.id }}
                    className="text-primary hover:underline"
                  >
                    {veh.id} · {veh.name}
                  </Link>
                )
              }
            />
            <Field
              label="Project"
              value={
                proj && (
                  <Link
                    to="/projects/$id"
                    params={{ id: proj.id }}
                    className="text-primary hover:underline"
                  >
                    {proj.id} · {proj.name}
                  </Link>
                )
              }
            />
            <Field label="Location" value={cur?.location} />
          </dl>
        </Panel>
      </div>
      <Panel title="Assignment History">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>Vehicle</th>
                <th className={th}>Project</th>
                <th className={th}>Location</th>
                <th className={th}>Start</th>
                <th className={th}>End</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {hist.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <Link
                      to="/vehicles/$id"
                      params={{ id: a.vehicleId }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {a.vehicleId}
                    </Link>
                  </td>
                  <td className={td}>
                    {db.projects.find((p) => p.id === a.projectId)?.name ?? "—"}
                  </td>
                  <td className={td}>{a.location || "—"}</td>
                  <td className={td}>{fmtDate(a.startDate)}</td>
                  <td className={td}>{fmtDate(a.endDate)}</td>
                  <td className={td}>
                    <StatusBadge status={a.active ? "Active" : "Completed"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hist.length && <EmptyState title="No assignments yet" />}
        </div>
      </Panel>
    </div>
  );
}
