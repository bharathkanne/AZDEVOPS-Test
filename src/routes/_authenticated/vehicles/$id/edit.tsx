import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { VehicleForm } from "@/components/fleet/VehicleForm";
import { EmptyState, PageHeader } from "@/components/fleet/common";
import { can, getSession, useDB } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/vehicles/$id/edit")({
  beforeLoad: () => {
    if (!can(getSession()?.role, "write")) throw redirect({ to: "/vehicles" });
  },
  head: ({ params }) => ({
    meta: [
      { title: `Edit ${params.id} — Fleet Ops` },
      { name: "description", content: "Edit vehicle record." },
      { property: "og:title", content: `Edit ${params.id}` },
      { property: "og:description", content: "Edit vehicle record." },
    ],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const v = useDB().vehicles.find((x) => x.id === id && !x.deleted);
  if (!v)
    return (
      <div>
        <EmptyState title="Vehicle not found" />
        <div className="text-center">
          <Link to="/vehicles" className="text-sm text-primary">
            Back to vehicles
          </Link>
        </div>
      </div>
    );
  return (
    <div>
      <PageHeader title={`Edit ${v.name}`} subtitle={v.id} />
      <VehicleForm initial={v} />
    </div>
  );
}
