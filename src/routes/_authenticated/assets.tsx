import { createFileRoute } from "@tanstack/react-router";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, nextId, useDB } from "@/lib/store";
import { ASSET_GROUPS, fmtMoney } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { Asset } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/assets")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assets — Vehicle Management CMS" },
      { name: "description", content: "Asset master: vehicles, equipment, machinery and tools." },
      { property: "og:title", content: "Assets" },
      { property: "og:description", content: "Asset master." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const { q } = Route.useSearch();
  const rows = db.assets
    .filter((a) => !a.deleted)
    .map((a) => ({
      ...a,
      linked: db.vehicles.find((v) => !v.deleted && v.assetId === a.id)?.id ?? "",
    }));
  return (
    <EntityPage<Asset & { linked: string }>
      title="Assets"
      singular="Asset"
      subtitle="Asset master — vehicle-group assets can be linked to one vehicle"
      rows={rows}
      initialQuery={q}
      columns={[
        {
          key: "id",
          label: "Asset ID",
          render: (r) => <span className="font-mono text-xs font-medium">{r.id}</span>,
        },
        {
          key: "name",
          label: "Asset Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "ain", label: "AIN" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "vendor", label: "Vendor" },
        { key: "group", label: "Group" },
        { key: "subGroup", label: "Sub Group" },
        { key: "location", label: "Location" },
        {
          key: "costPrice",
          label: "Cost Price",
          value: (r) => r.costPrice ?? 0,
          render: (r) => fmtMoney(r.costPrice),
        },
        {
          key: "linked",
          label: "Linked Vehicle",
          render: (r) =>
            r.linked ? (
              <IdLink to="/vehicles/$id" id={r.linked} />
            ) : r.group === "Vehicle" ? (
              <span className="text-xs text-muted-foreground">Not linked</span>
            ) : (
              "—"
            ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      filter={{ key: "group", label: "Groups", options: ASSET_GROUPS }}
      fields={[
        { key: "id", label: "Asset ID", required: true },
        { key: "name", label: "Asset Name", required: true },
        { key: "ain", label: "AIN" },
        { key: "manufacturer", label: "Manufacturer" },
        { key: "vendor", label: "Vendor" },
        {
          key: "group",
          label: "Group",
          type: "select",
          required: true,
          options: ASSET_GROUPS.map((o) => ({ value: o, label: o })),
        },
        { key: "subGroup", label: "Sub Group" },
        { key: "location", label: "Location" },
        { key: "costPrice", label: "Cost Price ($)", type: "number" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ["Active", "In Storage", "Disposed"].map((o) => ({ value: o, label: o })),
        },
      ]}
      newId={() =>
        nextId(
          "AS-",
          getDB().assets.map((o) => o.id),
        )
      }
      defaults={{ status: "Active", group: "Vehicle" }}
      onSave={(r, n) => {
        const { linked, ...a } = r;
        if (linked && a.group !== "Vehicle")
          return `Asset is linked to ${linked}; group must stay "Vehicle"`;
        return upsert("assets", a as Asset, n);
      }}
      onDelete={(r) => softDelete("assets", r.id)}
    />
  );
}
