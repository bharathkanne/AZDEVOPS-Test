import { createFileRoute } from "@tanstack/react-router";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, nextId, useDB } from "@/lib/store";
import { expiryStatus, fmtDate } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { Driver } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/drivers/")({
  head: () => ({
    meta: [
      { title: "Drivers — Fleet Ops" },
      { name: "description", content: "Driver roster, licenses and assignments." },
      { property: "og:title", content: "Drivers" },
      { property: "og:description", content: "Driver roster." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const rows = db.drivers
    .filter((d) => !d.deleted)
    .map((d) => ({
      ...d,
      vehicle: db.assignments.find((a) => a.active && a.driverId === d.id)?.vehicleId ?? "",
    }));
  return (
    <EntityPage<Driver & { vehicle: string }>
      title="Drivers"
      singular="Driver"
      subtitle="Licensed operators and their current vehicles"
      rows={rows}
      columns={[
        { key: "id", label: "Driver ID" },
        {
          key: "name",
          label: "Full Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "licenseNumber", label: "License #" },
        { key: "licenseType", label: "License Type" },
        {
          key: "licenseExpiry",
          label: "License Expiry",
          render: (r) => {
            const s = expiryStatus(r.licenseExpiry, db.company.expiryWarningDays);
            return (
              <span className="flex items-center gap-2">
                {fmtDate(r.licenseExpiry)}
                {s !== "Valid" && <StatusBadge status={s} />}
              </span>
            );
          },
        },
        { key: "vehicle", label: "Vehicle" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      detail={(r) => <IdLink to="/drivers/$id" id={r.id} />}
      filter={{ key: "status", label: "Statuses", options: ["Active", "Inactive"] }}
      fields={[
        { key: "id", label: "Driver ID", required: true },
        { key: "name", label: "Full Name", required: true },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "licenseNumber", label: "License Number" },
        {
          key: "licenseType",
          label: "License Type",
          type: "select",
          options: ["CDL Class A", "CDL Class B", "CDL Class C", "Class C", "Other"].map((o) => ({
            value: o,
            label: o,
          })),
        },
        { key: "licenseExpiry", label: "License Expiry", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Active", "Inactive"].map((o) => ({ value: o, label: o })),
        },
      ]}
      newId={() =>
        nextId(
          "DR-",
          getDB().drivers.map((o) => o.id),
        )
      }
      defaults={{ status: "Active" }}
      onSave={(r, n) => {
        const { vehicle: _v, ...o } = r;
        return upsert("drivers", o as Driver, n);
      }}
      onDelete={(r) => softDelete("drivers", r.id)}
    />
  );
}
