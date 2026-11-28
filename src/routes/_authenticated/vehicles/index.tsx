import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Eye, Pencil, Trash2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { can, useDB, useSession } from "@/lib/store";
import {
  OWNERSHIP_TYPES,
  VEHICLE_STATUSES,
  exportCSV,
  expiryStatus,
  fmtNum,
  liveVehicles,
  maintenanceSummary,
  vehicleView,
  daysUntil,
} from "@/lib/fleet";
import { deleteVehicle } from "@/lib/actions";
import {
  EmptyState,
  PageHeader,
  Pager,
  Panel,
  SortHead,
  StatusBadge,
  td,
  th,
  useConfirm,
} from "@/components/fleet/common";

type S = {
  q?: string;
  status?: string;
  ownership?: string;
  project?: string;
  owner?: string;
  driver?: string;
  flag?: string;
};

export const Route = createFileRoute("/_authenticated/vehicles/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: s.q as string | undefined,
    status: s.status as string | undefined,
    ownership: s.ownership as string | undefined,
    project: s.project as string | undefined,
    owner: s.owner as string | undefined,
    driver: s.driver as string | undefined,
    flag: s.flag as string | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vehicles — Fleet Ops" },
      { name: "description", content: "Vehicle master list with search, filters and sorting." },
      { property: "og:title", content: "Vehicles — Fleet Ops" },
      { property: "og:description", content: "Vehicle master list." },
    ],
  }),
  component: VehiclesPage,
});

const FLAGS: Record<string, string> = {
  unassigned: "Unassigned",
  reg: "Registration expiring",
  ins: "Insurance expiring",
  maint: "Maintenance due",
};

function VehiclesPage() {
  const db = useDB();
  const session = useSession();
  const writable = can(session?.role, "write");
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/vehicles/" });
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: "id", dir: 1 });
  const [page, setPage] = useState(1);
  const { confirm, node } = useConfirm();
  const setS = (patch: Partial<S>) => {
    setPage(1);
    nav({ search: (p: S) => ({ ...p, ...patch }), replace: true });
  };

  const rows = useMemo(() => {
    const warn = db.company.expiryWarningDays;
    const q = (search.q ?? "").toLowerCase();
    let r = liveVehicles(db).map((v) => vehicleView(db, v));
    if (q)
      r = r.filter((v) =>
        [
          v.id,
          v.assetId,
          v.vin,
          v.plate,
          v.make,
          v.model,
          v.name,
          v.ownerName,
          v.driverName,
          v.projectName,
          v.projectId,
        ].some((x) => x?.toLowerCase().includes(q)),
      );
    if (search.status) r = r.filter((v) => v.status === search.status);
    if (search.ownership) r = r.filter((v) => v.ownershipType === search.ownership);
    if (search.project) r = r.filter((v) => v.projectId === search.project);
    if (search.owner) r = r.filter((v) => v.ownerId === search.owner);
    if (search.driver) r = r.filter((v) => v.driverId === search.driver);
    if (search.flag === "unassigned") r = r.filter((v) => !v.assignment);
    if (search.flag === "reg") r = r.filter((v) => expiryStatus(v.regExpiry, warn) !== "Valid");
    if (search.flag === "ins") r = r.filter((v) => expiryStatus(v.insExpiry, warn) !== "Valid");
    if (search.flag === "maint")
      r = r.filter((v) => {
        const m = maintenanceSummary(db, v.id);
        return m.next && (daysUntil(m.next) ?? 0) < 0;
      });
    const key: Record<string, (v: (typeof r)[number]) => string | number> = {
      id: (v) => v.id,
      make: (v) => v.make,
      model: (v) => v.model,
      owner: (v) => v.ownerName,
      project: (v) => v.projectName,
      status: (v) => v.status,
      mileage: (v) => v.mileage ?? 0,
    };
    const f = key[sort.k];
    return [...r].sort((a, b) => {
      const x = f(a),
        y = f(b);
      return (
        (typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y))) * sort.dir
      );
    });
  }, [db, search, sort]);

  const size = db.company.pageSize || 10;
  const cur = rows.slice((page - 1) * size, page * size);
  const active = Object.entries(search).filter(([, v]) => v).length;
  const sel = (k: keyof S, ph: string, opts: { v: string; l: string }[]) => (
    <Select
      value={search[k] ?? "all"}
      onValueChange={(v) => setS({ [k]: v === "all" ? undefined : v })}
    >
      <SelectTrigger className="h-9 w-[150px]">
        <SelectValue placeholder={ph} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {ph}</SelectItem>
        {opts.map((o) => (
          <SelectItem key={o.v} value={o.v}>
            {o.l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <PageHeader
        title="Fleet Register"
        subtitle={`${liveVehicles(db).length} units in your fleet`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportCSV(
                  "vehicles.csv",
                  rows.map((v) => ({
                    "Vehicle ID": v.id,
                    "Asset ID": v.assetId,
                    Name: v.name,
                    Make: v.make,
                    Model: v.model,
                    Year: v.year,
                    VIN: v.vin,
                    Plate: v.plate,
                    Owner: v.ownerName,
                    Driver: v.driverName,
                    Project: v.projectName,
                    Location: v.currentLocation,
                    Mileage: v.mileage,
                    Status: v.status,
                  })),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export
            </Button>
            {writable && (
              <Button size="sm" asChild>
                <Link to="/vehicles/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Vehicle
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              defaultValue={search.q}
              key={search.q}
              onChange={(e) => setS({ q: e.target.value || undefined })}
              placeholder="Search unit, asset tag, VIN, plate or operator…"
              className="h-9 pl-8"
            />
          </div>
          {sel(
            "status",
            "Statuses",
            VEHICLE_STATUSES.map((s) => ({ v: s, l: s })),
          )}
          {sel(
            "ownership",
            "Ownership",
            OWNERSHIP_TYPES.map((s) => ({ v: s, l: s })),
          )}
          {sel(
            "project",
            "Projects",
            db.projects
              .filter((p) => !p.deleted)
              .map((p) => ({ v: p.id, l: `${p.id} · ${p.name}` })),
          )}
          {sel(
            "owner",
            "Owners",
            db.owners.filter((p) => !p.deleted).map((p) => ({ v: p.id, l: p.name })),
          )}
          {sel(
            "driver",
            "Drivers",
            db.drivers.filter((p) => !p.deleted).map((p) => ({ v: p.id, l: p.name })),
          )}
          {active > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPage(1);
                nav({ search: {}, replace: true });
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        {search.flag && (
          <div className="border-b bg-accent px-4 py-2 text-xs text-accent-foreground">
            Showing: <b>{FLAGS[search.flag]}</b>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className={th}>
                  <SortHead label="Vehicle ID" k="id" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>Asset ID</th>
                <th className={th}>Vehicle Name</th>
                <th className={th}>
                  <SortHead label="Make" k="make" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>
                  <SortHead label="Model" k="model" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>Year</th>
                <th className={th}>VIN</th>
                <th className={th}>Plate</th>
                <th className={th}>
                  <SortHead label="Owner" k="owner" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>Driver</th>
                <th className={th}>
                  <SortHead label="Project" k="project" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>Location</th>
                <th className={th}>
                  <SortHead label="Mileage" k="mileage" sort={sort} setSort={setSort} />
                </th>
                <th className={th}>
                  <SortHead label="Status" k="status" sort={sort} setSort={setSort} />
                </th>
                <th className={th + " text-right"}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cur.map((v) => (
                <tr key={v.id} className="hover:bg-muted/40">
                  <td className={td}>
                    <Link
                      to="/vehicles/$id"
                      params={{ id: v.id }}
                      className="font-mono text-xs font-medium text-primary hover:underline"
                    >
                      {v.id}
                    </Link>
                  </td>
                  <td className={td + " font-mono text-xs text-muted-foreground"}>
                    {v.assetId ?? "—"}
                  </td>
                  <td className={td + " font-medium"}>{v.name}</td>
                  <td className={td}>{v.make}</td>
                  <td className={td}>{v.model}</td>
                  <td className={td}>{v.year ?? "—"}</td>
                  <td className={td + " font-mono text-xs"}>{v.vin ?? "—"}</td>
                  <td className={td + " font-mono text-xs"}>{v.plate ?? "—"}</td>
                  <td className={td}>{v.ownerName || "—"}</td>
                  <td className={td}>
                    {v.driverName || <span className="text-muted-foreground">Unassigned</span>}
                  </td>
                  <td className={td}>
                    {v.projectId ? <span title={v.projectName}>{v.projectId}</span> : "—"}
                  </td>
                  <td className={td + " text-muted-foreground"}>{v.currentLocation || "—"}</td>
                  <td className={td + " tabular-nums"}>{fmtNum(v.mileage)}</td>
                  <td className={td}>
                    <StatusBadge status={v.status} />
                  </td>
                  <td className={td + " text-right"}>
                    <div className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                        aria-label="View"
                      >
                        <Link to="/vehicles/$id" params={{ id: v.id }}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {writable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          aria-label="Edit"
                        >
                          <Link to="/vehicles/$id/edit" params={{ id: v.id }}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {writable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete"
                          onClick={() =>
                            confirm(
                              `Delete vehicle ${v.id}?`,
                              "The vehicle will be archived, its active assignment closed and its asset link released. History is retained.",
                              () => {
                                deleteVehicle(v.id);
                                toast.success(`Vehicle ${v.id} deleted`);
                              },
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cur.length && (
            <EmptyState
              title="No units match your search"
              hint={active ? "Try clearing filters." : "Add your first vehicle to get started."}
            />
          )}
        </div>
        <Pager
          page={page}
          pages={Math.ceil(rows.length / size)}
          total={rows.length}
          setPage={setPage}
        />
      </Panel>
      {node}
    </div>
  );
}
