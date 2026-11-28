import { createFileRoute } from "@tanstack/react-router";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, nextId, useDB } from "@/lib/store";
import { SERVICE_TYPES, daysUntil, fmtDate, fmtMoney, fmtNum } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { Maintenance } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Fleet Ops" },
      { name: "description", content: "Service history, costs and upcoming maintenance." },
      { property: "og:title", content: "Maintenance" },
      { property: "og:description", content: "Service history." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const vehicles = db.vehicles.filter((v) => !v.deleted);
  const rows = db.maintenance
    .filter((m) => !m.deleted)
    .map((m) => ({
      ...m,
      vehicleName: vehicles.find((v) => v.id === m.vehicleId)?.name ?? m.vehicleId,
    }));
  return (
    <EntityPage<Maintenance & { vehicleName: string }>
      title="Service Center"
      singular="Maintenance Record"
      subtitle="Service history, workshop activity and upcoming inspections"
      rows={rows}
      columns={[
        {
          key: "id",
          label: "Service ID",
          render: (r) => <span className="font-mono text-xs">{r.id}</span>,
        },
        {
          key: "vehicleId",
          label: "Vehicle",
          render: (r) => (
            <span>
              <IdLink to="/vehicles/$id" id={r.vehicleId} />{" "}
              <span className="text-xs text-muted-foreground">{r.vehicleName}</span>
            </span>
          ),
        },
        { key: "serviceDate", label: "Service Date", render: (r) => fmtDate(r.serviceDate) },
        { key: "serviceType", label: "Service Type" },
        {
          key: "mileage",
          label: "Mileage",
          value: (r) => r.mileage ?? 0,
          render: (r) => fmtNum(r.mileage),
        },
        { key: "cost", label: "Cost", value: (r) => r.cost ?? 0, render: (r) => fmtMoney(r.cost) },
        { key: "vendor", label: "Vendor" },
        {
          key: "nextServiceDate",
          label: "Next Service",
          render: (r) => (
            <span className="flex items-center gap-2">
              {fmtDate(r.nextServiceDate)}
              {r.nextServiceDate && (daysUntil(r.nextServiceDate) ?? 0) < 0 && (
                <StatusBadge status="Maintenance Due" />
              )}
            </span>
          ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      filter={{ key: "serviceType", label: "Service Types", options: SERVICE_TYPES }}
      fields={[
        { key: "id", label: "Service ID", required: true },
        {
          key: "vehicleId",
          label: "Vehicle",
          type: "select",
          required: true,
          options: vehicles.map((v) => ({ value: v.id, label: `${v.id} · ${v.name}` })),
        },
        { key: "serviceDate", label: "Service Date", type: "date", required: true },
        {
          key: "serviceType",
          label: "Service Type",
          type: "select",
          required: true,
          options: SERVICE_TYPES.map((o) => ({ value: o, label: o })),
        },
        { key: "mileage", label: "Mileage", type: "number" },
        { key: "cost", label: "Cost ($)", type: "number" },
        { key: "vendor", label: "Vendor" },
        { key: "nextServiceDate", label: "Next Service Date", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Completed", "In Progress", "Scheduled"].map((o) => ({ value: o, label: o })),
        },
        { key: "description", label: "Description", type: "textarea" },
        { key: "parts", label: "Parts / Work Performed", type: "textarea" },
        { key: "notes", label: "Notes", type: "textarea" },
      ]}
      newId={() =>
        nextId(
          "MT-",
          getDB().maintenance.map((o) => o.id),
        )
      }
      defaults={{
        status: "Completed",
        serviceType: "Preventive Maintenance",
        serviceDate: new Date().toISOString().slice(0, 10),
      }}
      onSave={(r, n) => {
        const { vehicleName: _v, ...m } = r;
        if ((m.cost ?? 0) < 0) return "Cost cannot be negative";
        return upsert("maintenance", m as Maintenance, n);
      }}
      onDelete={(r) => softDelete("maintenance", r.id)}
    />
  );
}
