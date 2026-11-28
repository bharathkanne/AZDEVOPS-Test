import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, getSession, nextId, useDB } from "@/lib/store";
import { DOC_TYPES, expiryStatus, fmtDate } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { DocumentRec } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/documents")({
  validateSearch: (s: Record<string, unknown>): { vehicle?: string } => ({
    vehicle: typeof s.vehicle === "string" ? s.vehicle : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Documents — Fleet Ops" },
      {
        name: "description",
        content: "Registration, insurance, titles and other vehicle documents.",
      },
      { property: "og:title", content: "Documents" },
      { property: "og:description", content: "Vehicle documents." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const { vehicle } = Route.useSearch();
  const vehicles = db.vehicles.filter((v) => !v.deleted);
  const rows = db.documents.filter((d) => !d.deleted);
  return (
    <EntityPage<DocumentRec>
      title="Documents"
      singular="Document"
      subtitle="Files are stored in this browser for the local version (max 1.5 MB each)"
      rows={rows}
      initialQuery={vehicle}
      columns={[
        {
          key: "id",
          label: "Doc ID",
          render: (r) => <span className="font-mono text-xs">{r.id}</span>,
        },
        {
          key: "name",
          label: "Document Name",
          render: (r) => (
            <span className="flex items-center gap-2 font-medium">
              {r.name}
              {r.fileData && (
                <a
                  href={r.fileData}
                  download={r.fileName}
                  aria-label="Download"
                  className="text-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
            </span>
          ),
        },
        { key: "type", label: "Type" },
        {
          key: "vehicleId",
          label: "Vehicle",
          render: (r) => (r.vehicleId ? <IdLink to="/vehicles/$id" id={r.vehicleId} /> : "—"),
        },
        { key: "issueDate", label: "Issue Date", render: (r) => fmtDate(r.issueDate) },
        {
          key: "expiryDate",
          label: "Expiry",
          render: (r) =>
            r.expiryDate ? (
              <span className="flex items-center gap-2">
                {fmtDate(r.expiryDate)}
                <StatusBadge status={expiryStatus(r.expiryDate, db.company.expiryWarningDays)} />
              </span>
            ) : (
              "—"
            ),
        },
        { key: "uploadedBy", label: "Uploaded By" },
        { key: "uploadedDate", label: "Uploaded", render: (r) => fmtDate(r.uploadedDate) },
      ]}
      filter={{ key: "type", label: "Types", options: DOC_TYPES }}
      fields={[
        { key: "id", label: "Document ID", required: true },
        { key: "name", label: "Document Name", required: true },
        {
          key: "type",
          label: "Document Type",
          type: "select",
          required: true,
          options: DOC_TYPES.map((o) => ({ value: o, label: o })),
        },
        {
          key: "vehicleId",
          label: "Vehicle",
          type: "select",
          options: vehicles.map((v) => ({ value: v.id, label: `${v.id} · ${v.name}` })),
        },
        { key: "issueDate", label: "Issue Date", type: "date" },
        { key: "expiryDate", label: "Expiry Date", type: "date" },
        { key: "file", label: "Upload File", type: "file", full: true },
      ]}
      newId={() =>
        nextId(
          "DOC-",
          getDB().documents.map((o) => o.id),
        )
      }
      defaults={{ type: "Registration", vehicleId: vehicle }}
      onSave={(r, n) =>
        upsert(
          "documents",
          {
            ...r,
            uploadedBy: n ? (getSession()?.username ?? "system") : r.uploadedBy,
            uploadedDate: n ? new Date().toISOString().slice(0, 10) : r.uploadedDate,
          },
          n,
        )
      }
      onDelete={(r) => softDelete("documents", r.id)}
    />
  );
}
