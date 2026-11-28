import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  UserPlus,
  Wrench,
  Truck,
  MapPin,
  User,
  FolderKanban,
  Building2,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { can, useDB, useSession } from "@/lib/store";
import {
  complianceItems,
  daysUntil,
  expiryStatus,
  fmtDate,
  fmtMoney,
  fmtNum,
  maintenanceSummary,
  vehicleView,
} from "@/lib/fleet";
import { deleteVehicle } from "@/lib/actions";
import {
  EmptyState,
  Field,
  Panel,
  StatusBadge,
  td,
  th,
  useConfirm,
} from "@/components/fleet/common";
import { AssignDialog, MaintenanceDialog } from "@/components/fleet/dialogs";

const TABS = [
  "general",
  "ownership",
  "assignment",
  "compliance",
  "financial",
  "maintenance",
  "documents",
] as const;

export const Route = createFileRoute("/_authenticated/vehicles/$id/")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Fleet Ops` },
      {
        name: "description",
        content: "Vehicle detail: ownership, assignment, compliance, maintenance and documents.",
      },
      { property: "og:title", content: `Vehicle ${params.id}` },
      { property: "og:description", content: "Vehicle detail record." },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const db = useDB();
  const session = useSession();
  const writable = can(session?.role, "write");
  const nav = useNavigate();
  const [assign, setAssign] = useState(false);
  const [maint, setMaint] = useState(false);
  const { confirm, node } = useConfirm();
  const raw = db.vehicles.find((v) => v.id === id && !v.deleted);
  if (!raw)
    return (
      <div className="py-10">
        <EmptyState title="Vehicle not found" hint="It may have been deleted." />
        <div className="text-center">
          <Link to="/vehicles" className="text-sm text-primary hover:underline">
            Back to vehicles
          </Link>
        </div>
      </div>
    );
  const v = vehicleView(db, raw);
  const owner = db.owners.find((o) => o.id === v.ownerId);
  const ms = maintenanceSummary(db, v.id);
  const history = db.assignments
    .filter((a) => a.vehicleId === v.id)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const docs = db.documents.filter((d) => d.vehicleId === v.id && !d.deleted);
  const asset = db.assets.find((a) => a.id === v.assetId);
  const warn = db.company.expiryWarningDays;
  const pName = (pid?: string) => db.projects.find((p) => p.id === pid)?.name;
  const dName = (did?: string) => db.drivers.find((p) => p.id === did)?.name;

  const quick = [
    { icon: MapPin, label: "Location", value: v.currentLocation || "—" },
    {
      icon: Building2,
      label: "Owner",
      value: v.ownerName || "—",
      to: owner ? { to: "/owners/$id" as const, id: owner.id } : undefined,
    },
    {
      icon: User,
      label: "Driver",
      value: v.driverName || "Unassigned",
      to: v.driverId ? { to: "/drivers/$id" as const, id: v.driverId } : undefined,
    },
    {
      icon: FolderKanban,
      label: "Project",
      value: v.projectId ? `${v.projectId} · ${v.projectName}` : "Unassigned",
      to: v.projectId ? { to: "/projects/$id" as const, id: v.projectId } : undefined,
    },
  ];
  const worst = complianceItems(v).map((c) => expiryStatus(c.date, warn));
  const compStatus = worst.includes("Expired")
    ? "Expired"
    : worst.includes("Expiring Soon")
      ? "Expiring Soon"
      : "Valid";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          {v.photo ? (
            <img src={v.photo} alt={v.name} className="h-20 w-28 rounded-lg border object-cover" />
          ) : (
            <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-muted">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{v.name}</h1>
              <StatusBadge status={v.status} />
              {ms.due && <StatusBadge status="Maintenance Due" />}
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {v.id}
              {v.plate && ` · ${v.plate}`}
              {v.vin && ` · VIN ${v.vin}`}
            </p>
          </div>
          {writable && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/vehicles/$id/edit" params={{ id: v.id }}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAssign(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Assign
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMaint(true)}>
                <Wrench className="mr-1.5 h-4 w-4" />
                Add Maintenance
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() =>
                  confirm(
                    `Delete vehicle ${v.id}?`,
                    "The vehicle will be archived, its active assignment closed and its asset link released. History is retained.",
                    () => {
                      deleteVehicle(v.id);
                      toast.success("Vehicle deleted");
                      nav({ to: "/vehicles" });
                    },
                  )
                }
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
        <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
          {quick.map((q) => (
            <div key={q.label} className="flex items-start gap-2.5">
              <q.icon className="mt-0.5 h-4 w-4 text-primary" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{q.label}</div>
                {q.to ? (
                  <Link
                    to={q.to.to}
                    params={{ id: q.to.id }}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {q.value}
                  </Link>
                ) : (
                  <div className="truncate text-sm font-medium">{q.value}</div>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2.5">
            <Wrench className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Compliance · Next service</div>
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={compStatus} /> {fmtDate(ms.next)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={tab && (TABS as readonly string[]).includes(tab) ? tab : "general"}
        onValueChange={(t) =>
          nav({ to: "/vehicles/$id", params: { id }, search: { tab: t }, replace: true })
        }
      >
        <div className="overflow-x-auto">
          <TabsList className="bg-card">
            {TABS.map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="general">
          <Panel title="General Information">
            <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Vehicle ID" value={v.id} />
              <Field
                label="Asset ID"
                value={
                  asset ? (
                    <Link
                      to="/assets"
                      search={{ q: asset.id }}
                      className="text-primary hover:underline"
                    >
                      {asset.id} · {asset.name}
                    </Link>
                  ) : (
                    v.assetId
                  )
                }
              />
              <Field label="Vehicle Type" value={v.type} />
              <Field label="Make" value={v.make} />
              <Field label="Model" value={v.model} />
              <Field label="Year" value={v.year} />
              <Field label="VIN" value={v.vin} />
              <Field label="License Plate" value={v.plate} />
              <Field label="State Registered" value={v.stateRegistered} />
              <Field label="Mileage" value={fmtNum(v.mileage)} />
              <Field label="Fuel Type" value={v.fuelType} />
              <Field label="Fuel Card" value={v.fuelCard} />
              <Field label="GPS / Tracking ID" value={v.gpsId} />
              <Field label="Current Location" value={v.currentLocation} />
              <Field label="Status" value={<StatusBadge status={v.status} />} />
            </dl>
          </Panel>
        </TabsContent>

        <TabsContent value="ownership">
          <Panel title="Ownership">
            <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Ownership Type" value={v.ownershipType} />
              <Field
                label="Owner"
                value={
                  owner ? (
                    <Link
                      to="/owners/$id"
                      params={{ id: owner.id }}
                      className="text-primary hover:underline"
                    >
                      {owner.name}
                    </Link>
                  ) : undefined
                }
              />
              <Field
                label="Owner Contact"
                value={owner ? `${owner.phone ?? ""} ${owner.email ?? ""}` : undefined}
              />
              <Field label="Vendor / Lessor" value={v.vendor} />
              <Field label="Purchase Date" value={fmtDate(v.purchaseDate)} />
              <Field label="Purchase Price" value={fmtMoney(v.purchasePrice)} />
              <Field label="Lease Start" value={fmtDate(v.leaseStart)} />
              <Field label="Lease End" value={fmtDate(v.leaseEnd)} />
              <Field label="Monthly Lease Cost" value={fmtMoney(v.monthlyLease)} />
            </dl>
          </Panel>
        </TabsContent>

        <TabsContent value="assignment" className="space-y-4">
          <Panel
            title="Current Assignment"
            action={
              writable && (
                <Button size="sm" variant="outline" onClick={() => setAssign(true)}>
                  Change
                </Button>
              )
            }
          >
            {v.assignment ? (
              <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-5">
                <Field
                  label="Project"
                  value={
                    v.projectId && (
                      <Link
                        to="/projects/$id"
                        params={{ id: v.projectId }}
                        className="text-primary hover:underline"
                      >
                        {v.projectId} · {v.projectName}
                      </Link>
                    )
                  }
                />
                <Field
                  label="Driver"
                  value={
                    v.driverId && (
                      <Link
                        to="/drivers/$id"
                        params={{ id: v.driverId }}
                        className="text-primary hover:underline"
                      >
                        {v.driverName}
                      </Link>
                    )
                  }
                />
                <Field label="Supervisor" value={v.assignment.supervisor} />
                <Field label="Location" value={v.assignment.location} />
                <Field label="Assigned Since" value={fmtDate(v.assignment.startDate)} />
                {v.assignment.notes && (
                  <div className="sm:col-span-full">
                    <Field label="Notes" value={v.assignment.notes} />
                  </div>
                )}
              </dl>
            ) : (
              <EmptyState title="Not currently assigned" />
            )}
          </Panel>
          <Panel title="Assignment History">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className={th}>Project</th>
                    <th className={th}>Driver</th>
                    <th className={th}>Supervisor</th>
                    <th className={th}>Location</th>
                    <th className={th}>Start</th>
                    <th className={th}>End</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((a) => (
                    <tr key={a.id}>
                      <td className={td}>
                        {a.projectId ? `${a.projectId} · ${pName(a.projectId) ?? ""}` : "—"}
                      </td>
                      <td className={td}>{dName(a.driverId) ?? "—"}</td>
                      <td className={td}>{a.supervisor || "—"}</td>
                      <td className={td}>{a.location || "—"}</td>
                      <td className={td}>{fmtDate(a.startDate)}</td>
                      <td className={td}>{fmtDate(a.endDate)}</td>
                      <td className={td}>
                        <StatusBadge status={a.active ? "Active" : "Completed"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!history.length && <EmptyState title="No assignment history" />}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Registration",
                rows: [
                  ["Number", v.regNumber],
                  ["State", v.regState],
                  ["Expiry", fmtDate(v.regExpiry)],
                ],
                d: v.regExpiry,
              },
              {
                t: "Insurance",
                rows: [
                  ["Provider", v.insProvider],
                  ["Policy", v.insPolicy],
                  ["Expiry", fmtDate(v.insExpiry)],
                ],
                d: v.insExpiry,
              },
              {
                t: "Inspection",
                rows: [
                  ["Inspected", fmtDate(v.inspDate)],
                  ["Expiry", fmtDate(v.inspExpiry)],
                ],
                d: v.inspExpiry,
              },
              {
                t: "Permit",
                rows: [
                  ["Number", v.permitNumber],
                  ["Expiry", fmtDate(v.permitExpiry)],
                ],
                d: v.permitExpiry,
              },
            ].map((c) => {
              const st = expiryStatus(c.d, warn);
              const n = daysUntil(c.d);
              return (
                <div
                  key={c.t}
                  className={`rounded-xl border border-t-4 bg-card p-4 shadow-sm ${st === "Expired" ? "border-t-destructive" : st === "Expiring Soon" ? "border-t-warning" : st === "Valid" ? "border-t-success" : "border-t-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{c.t}</h3>
                    <StatusBadge status={st} />
                  </div>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    {c.rows.map(([k, val]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="truncate font-medium">{val || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  {n !== null && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {n < 0 ? `Expired ${-n} days ago` : `${n} days remaining`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <Panel title="Financial">
            <dl className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Purchase Price" value={fmtMoney(v.purchasePrice)} />
              <Field label="Purchase Date" value={fmtDate(v.purchaseDate)} />
              <Field label="Current Value" value={fmtMoney(v.currentValue)} />
              <Field label="Lease Cost (monthly)" value={fmtMoney(v.monthlyLease)} />
              <Field label="Monthly Payment" value={fmtMoney(v.monthlyPayment)} />
              <Field label="Vendor / Lessor" value={v.vendor} />
              <Field label="Lifetime Maintenance" value={fmtMoney(ms.total)} />
              <div className="sm:col-span-full">
                <Field label="Notes" value={v.financialNotes} />
              </div>
            </dl>
          </Panel>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              [
                "Last Service",
                ms.last ? `${fmtDate(ms.last.serviceDate)} · ${ms.last.serviceType}` : "—",
              ],
              ["Next Service", fmtDate(ms.next)],
              ["Total Maintenance Cost", fmtMoney(ms.total)],
              ["Number of Repairs", String(ms.repairs)],
            ].map(([l, val]) => (
              <div key={l} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="text-xs text-muted-foreground">{l}</div>
                <div className="mt-1 font-semibold">{val}</div>
                {l === "Next Service" && ms.due && (
                  <StatusBadge status="Maintenance Due" className="mt-2" />
                )}
              </div>
            ))}
          </div>
          <Panel
            title="Maintenance History"
            action={
              writable && (
                <Button size="sm" onClick={() => setMaint(true)}>
                  <Wrench className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              )
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className={th}>ID</th>
                    <th className={th}>Date</th>
                    <th className={th}>Type</th>
                    <th className={th}>Mileage</th>
                    <th className={th}>Cost</th>
                    <th className={th}>Vendor</th>
                    <th className={th}>Work</th>
                    <th className={th}>Next</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ms.recs.map((m) => (
                    <tr key={m.id}>
                      <td className={td + " font-mono text-xs"}>{m.id}</td>
                      <td className={td}>{fmtDate(m.serviceDate)}</td>
                      <td className={td}>{m.serviceType}</td>
                      <td className={td}>{fmtNum(m.mileage)}</td>
                      <td className={td}>{fmtMoney(m.cost)}</td>
                      <td className={td}>{m.vendor || "—"}</td>
                      <td className={td + " max-w-xs truncate"}>
                        {m.parts || m.description || "—"}
                      </td>
                      <td className={td}>{fmtDate(m.nextServiceDate)}</td>
                      <td className={td}>
                        <StatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!ms.recs.length && <EmptyState title="No maintenance recorded" />}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="documents">
          <Panel
            title="Documents"
            action={
              <Link
                to="/documents"
                search={{ vehicle: v.id }}
                className="text-xs text-primary hover:underline"
              >
                Manage documents
              </Link>
            }
          >
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.type} · uploaded {fmtDate(d.uploadedDate)} by {d.uploadedBy}
                    </div>
                  </div>
                  {d.expiryDate && (
                    <span className="text-xs text-muted-foreground">
                      Expires {fmtDate(d.expiryDate)}
                    </span>
                  )}
                  {d.expiryDate && <StatusBadge status={expiryStatus(d.expiryDate, warn)} />}
                  {d.fileData ? (
                    <a
                      href={d.fileData}
                      download={d.fileName}
                      className="text-primary"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Record only</span>
                  )}
                </li>
              ))}
              {!docs.length && <EmptyState title="No documents" />}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
      {assign && <AssignDialog vehicleId={v.id} open={assign} onOpenChange={setAssign} />}
      {maint && <MaintenanceDialog vehicleId={v.id} open={maint} onOpenChange={setMaint} />}
      {node}
    </div>
  );
}
