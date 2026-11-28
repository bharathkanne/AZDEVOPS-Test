import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fleet Ops" },
      {
        name: "description",
        content:
          "Fleet and asset lifecycle management: vehicles, owners, drivers, projects, compliance and maintenance.",
      },
      { property: "og:title", content: "Fleet Ops" },
      {
        property: "og:description",
        content: "Fleet and asset lifecycle management for company vehicles.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: getSession() ? "/dashboard" : "/login" });
  },
});
