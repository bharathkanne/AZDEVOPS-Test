import { createFileRoute, Link } from "@tanstack/react-router";
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
import { fmtDate } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project ${params.id} — Vehicle Management CMS` },
      { name: "description", content: "Project details with assigned vehicles and drivers." },
      { property: "og:title", content: `Project ${params.id}` },
      { property: "og:description", content: "Project details." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const db = useDB();
  const p = db.projects.find((x) => x.id === id && !x.deleted);
  if (!p) return <EmptyState title="Project not found" />;
  const as = db.assignments.filter((a) => a.active && a.projectId === id);
  const drivers = [...new Set(as.map((a) => a.driverId).filter(Boolean))]
    .map((d) => db.drivers.find((x) => x.id === d)!)
    .filter(Boolean);
  return (
    <div className="space-y-4">
      <PageHeader
        title={p.name}
        subtitle={`${p.id} · ${p.customer ?? ""}`}
        actions={<StatusBadge status={p.status} />}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Assigned Vehicles", as.length],
          ["Assigned Drivers", drivers.length],
          ["Location", p.location ?? "—"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <Panel title="Project Information">
        <dl className="grid gap-5 p-5 sm:grid-cols-4">
          <Field label="Customer" value={p.customer} />
          <Field label="Location" value={p.location} />
          <Field label="Start Date" value={fmtDate(p.startDate)} />
          <Field label="End Date" value={fmtDate(p.endDate)} />
        </dl>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Assigned Vehicles" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className={th}>Vehicle</th>
                  <th className={th}>Name</th>
                  <th className={th}>Driver</th>
                  <th className={th}>Supervisor</th>
                  <th className={th}>Since</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {as.map((a) => {
                  const v = db.vehicles.find((x) => x.id === a.vehicleId);
                  return (
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
                      <td className={td}>{v?.name}</td>
                      <td className={td}>
                        {db.drivers.find((d) => d.id === a.driverId)?.name ?? "—"}
                      </td>
                      <td className={td}>{a.supervisor || "—"}</td>
                      <td className={td}>{fmtDate(a.startDate)}</td>
                      <td className={td}>{v && <StatusBadge status={v.status} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!as.length && <EmptyState title="No vehicles assigned" />}
          </div>
        </Panel>
        <Panel title="Assigned Drivers">
          <ul className="divide-y">
            {drivers.map((d) => (
              <li key={d.id} className="px-4 py-2.5 text-sm">
                <Link to="/drivers/$id" params={{ id: d.id }} className="hover:text-primary">
                  {d.name}
                </Link>
                <div className="text-xs text-muted-foreground">{d.phone}</div>
              </li>
            ))}
            {!drivers.length && <EmptyState title="No drivers" />}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
