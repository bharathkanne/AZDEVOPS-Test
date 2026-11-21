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
import { fmtNum, vehicleView } from "@/lib/fleet";

export const Route = createFileRoute("/_authenticated/owners/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Owner ${params.id} — Vehicle Management CMS` },
      { name: "description", content: "Owner details and vehicles owned." },
      { property: "og:title", content: `Owner ${params.id}` },
      { property: "og:description", content: "Owner details." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const db = useDB();
  const o = db.owners.find((x) => x.id === id && !x.deleted);
  if (!o) return <EmptyState title="Owner not found" />;
  const vs = db.vehicles
    .filter((v) => !v.deleted && v.ownerId === id)
    .map((v) => vehicleView(db, v));
  return (
    <div className="space-y-4">
      <PageHeader title={o.name} subtitle={o.id} actions={<StatusBadge status={o.status} />} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total Vehicles", vs.length],
          ["Active Vehicles", vs.filter((v) => v.status === "Active").length],
          ["Ownership Type", o.ownershipType],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <Panel title="Owner Information">
        <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Company" value={o.company} />
          <Field label="Phone" value={o.phone} />
          <Field label="Email" value={o.email} />
          <Field label="Address" value={o.address} />
        </dl>
      </Panel>
      <Panel title="Vehicles Owned">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>Vehicle</th>
                <th className={th}>Name</th>
                <th className={th}>Plate</th>
                <th className={th}>Driver</th>
                <th className={th}>Project</th>
                <th className={th}>Mileage</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vs.map((v) => (
                <tr key={v.id}>
                  <td className={td}>
                    <Link
                      to="/vehicles/$id"
                      params={{ id: v.id }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {v.id}
                    </Link>
                  </td>
                  <td className={td}>{v.name}</td>
                  <td className={td}>{v.plate}</td>
                  <td className={td}>{v.driverName || "—"}</td>
                  <td className={td}>{v.projectName || "—"}</td>
                  <td className={td}>{fmtNum(v.mileage)}</td>
                  <td className={td}>
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!vs.length && <EmptyState title="No vehicles owned" />}
        </div>
      </Panel>
    </div>
  );
}
