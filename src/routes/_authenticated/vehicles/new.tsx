import { createFileRoute, redirect } from "@tanstack/react-router";
import { VehicleForm } from "@/components/fleet/VehicleForm";
import { PageHeader } from "@/components/fleet/common";
import { can, getSession } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/vehicles/new")({
  beforeLoad: () => {
    if (!can(getSession()?.role, "write")) throw redirect({ to: "/vehicles" });
  },
  head: () => ({
    meta: [
      { title: "Add Vehicle — Fleet Ops" },
      { name: "description", content: "Register a new fleet vehicle." },
      { property: "og:title", content: "Add Vehicle" },
      { property: "og:description", content: "Register a new fleet vehicle." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Add Vehicle" subtitle="Fields marked * are required." />
      <VehicleForm />
    </div>
  ),
});
