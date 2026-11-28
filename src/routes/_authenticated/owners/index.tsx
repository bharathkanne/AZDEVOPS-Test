import { createFileRoute } from "@tanstack/react-router";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, nextId, useDB } from "@/lib/store";
import { OWNERSHIP_TYPES } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { Owner } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/owners/")({
  head: () => ({
    meta: [
      { title: "Owners — Fleet Ops" },
      { name: "description", content: "Vehicle owners, lessors and rental companies." },
      { property: "og:title", content: "Owners" },
      { property: "og:description", content: "Vehicle owners." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const rows = db.owners
    .filter((o) => !o.deleted)
    .map((o) => ({
      ...o,
      vehicles: db.vehicles.filter((v) => !v.deleted && v.ownerId === o.id).length,
    }));
  return (
    <EntityPage<Owner & { vehicles: number }>
      title="Owners"
      singular="Owner"
      subtitle="Companies and lessors that own fleet vehicles"
      rows={rows}
      columns={[
        { key: "id", label: "Owner ID" },
        {
          key: "name",
          label: "Owner Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "company", label: "Company" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "ownershipType", label: "Ownership Type" },
        { key: "vehicles", label: "Vehicles", value: (r) => r.vehicles },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      detail={(r) => <IdLink to="/owners/$id" id={r.id} />}
      filter={{ key: "ownershipType", label: "Types", options: [...OWNERSHIP_TYPES] }}
      fields={[
        { key: "id", label: "Owner ID", required: true },
        { key: "name", label: "Owner Name", required: true },
        { key: "company", label: "Company" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        {
          key: "ownershipType",
          label: "Ownership Type",
          type: "select",
          required: true,
          options: OWNERSHIP_TYPES.map((o) => ({ value: o, label: o })),
        },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Active", "Inactive"].map((o) => ({ value: o, label: o })),
        },
        { key: "address", label: "Address", full: true },
      ]}
      newId={() =>
        nextId(
          "OW-",
          getDB().owners.map((o) => o.id),
        )
      }
      defaults={{ status: "Active", ownershipType: "Company Owned" }}
      onSave={(r, n) => {
        const { vehicles: _v, ...o } = r;
        return upsert("owners", o as Owner, n);
      }}
      onDelete={(r) => softDelete("owners", r.id)}
    />
  );
}
