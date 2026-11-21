import { createFileRoute } from "@tanstack/react-router";
import { EntityPage, IdLink } from "@/components/fleet/EntityPage";
import { StatusBadge } from "@/components/fleet/common";
import { getDB, nextId, useDB } from "@/lib/store";
import { fmtDate } from "@/lib/fleet";
import { softDelete, upsert } from "@/lib/actions";
import type { Project } from "@/lib/types";

const ST = ["New", "Active", "Completed", "On Hold", "Cancelled"];

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Vehicle Management CMS" },
      { name: "description", content: "Projects and the vehicles assigned to them." },
      { property: "og:title", content: "Projects" },
      { property: "og:description", content: "Projects and assigned vehicles." },
    ],
  }),
  component: Page,
});

function Page() {
  const db = useDB();
  const rows = db.projects
    .filter((p) => !p.deleted)
    .map((p) => ({
      ...p,
      vehicles: db.assignments.filter((a) => a.active && a.projectId === p.id).length,
    }));
  return (
    <EntityPage<Project & { vehicles: number }>
      title="Projects"
      singular="Project"
      subtitle="Job sites and customer projects"
      rows={rows}
      columns={[
        { key: "id", label: "Project ID" },
        {
          key: "name",
          label: "Project Name",
          render: (r) => <span className="font-medium">{r.name}</span>,
        },
        { key: "customer", label: "Customer" },
        { key: "location", label: "Location" },
        { key: "startDate", label: "Start", render: (r) => fmtDate(r.startDate) },
        { key: "endDate", label: "End", render: (r) => fmtDate(r.endDate) },
        { key: "vehicles", label: "Vehicles", value: (r) => r.vehicles },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      detail={(r) => <IdLink to="/projects/$id" id={r.id} />}
      filter={{ key: "status", label: "Statuses", options: ST }}
      fields={[
        { key: "id", label: "Project ID", required: true },
        { key: "name", label: "Project Name", required: true },
        { key: "customer", label: "Customer" },
        { key: "location", label: "Location" },
        { key: "startDate", label: "Start Date", type: "date" },
        { key: "endDate", label: "End Date", type: "date" },
        {
          key: "status",
          label: "Status",
          type: "select",
          required: true,
          options: ST.map((o) => ({ value: o, label: o })),
        },
      ]}
      newId={() =>
        nextId(
          "P-",
          getDB().projects.map((o) => o.id),
        )
      }
      defaults={{ status: "New" }}
      onSave={(r, n) => {
        const { vehicles: _v, ...o } = r;
        if (o.startDate && o.endDate && o.endDate < o.startDate)
          return "End date must be after start date";
        return upsert("projects", o as Project, n);
      }}
      onDelete={(r) => softDelete("projects", r.id)}
    />
  );
}
