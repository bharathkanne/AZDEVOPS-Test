import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDB, nextId, useDB } from "@/lib/store";
import {
  FUEL_TYPES,
  OWNERSHIP_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  activeAssignment,
  complianceItems,
  expiryStatus,
} from "@/lib/fleet";
import { saveVehicle, validateVehicle, type AssignInput } from "@/lib/actions";
import type { Vehicle } from "@/lib/types";
import { StatusBadge } from "./common";

type CtxT = {
  v: Partial<Vehicle>;
  set: (k: keyof Vehicle, val: unknown) => void;
  errors: Record<string, string>;
  isNew: boolean;
};
const Ctx = createContext<CtxT>(null as unknown as CtxT);

function F({
  k,
  label,
  type = "text",
  req,
  children,
  full,
}: {
  k: keyof Vehicle;
  label: string;
  type?: string;
  req?: boolean;
  children?: ReactNode;
  full?: boolean;
}) {
  const { v, set, errors, isNew } = useContext(Ctx);
  return (
    <div id={`f-${k}`} className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
      <Label className="mb-1.5 block text-xs">
        {label}
        {req && <span className="text-destructive"> *</span>}
      </Label>
      {children ?? (
        <Input
          type={type}
          value={(v[k] as string | number | undefined) ?? ""}
          disabled={k === "id" && !isNew}
          aria-invalid={!!errors[k]}
          className={errors[k] ? "border-destructive" : ""}
          onChange={(e) =>
            set(
              k,
              type === "number"
                ? e.target.value === ""
                  ? undefined
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      )}
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
}
const Sel = ({
  value,
  onChange,
  opts,
  none = true,
  invalid,
}: {
  value?: string;
  onChange: (v: string) => void;
  opts: { v: string; l: string }[];
  none?: boolean;
  invalid?: boolean;
}) => (
  <Select value={value || undefined} onValueChange={(x) => onChange(x === "__none" ? "" : x)}>
    <SelectTrigger className={invalid ? "border-destructive" : ""}>
      <SelectValue placeholder="Select…" />
    </SelectTrigger>
    <SelectContent>
      {none && <SelectItem value="__none">— None —</SelectItem>}
      {opts.map((o) => (
        <SelectItem key={o.v} value={o.v}>
          {o.l}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
const Card = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-20 rounded-xl border bg-card shadow-sm">
    <h2 className="border-b px-5 py-3 text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

const SECTIONS = [
  ["general", "General Information"],
  ["ownership", "Ownership"],
  ["assignment", "Assignment"],
  ["compliance", "Compliance"],
  ["financial", "Financial"],
] as const;

export function VehicleForm({ initial }: { initial?: Vehicle }) {
  const db = useDB();
  const nav = useNavigate();
  const isNew = !initial;
  const [v, setV] = useState<Partial<Vehicle>>(
    () =>
      initial ?? {
        id: nextId(
          "VH-",
          getDB().vehicles.map((x) => x.id),
        ),
        status: "Active",
        ownershipType: "Company Owned",
        type: "Truck",
        fuelType: "Diesel",
      },
  );
  const cur = initial ? activeAssignment(db, initial.id) : undefined;
  const [a, setA] = useState<AssignInput>({
    projectId: cur?.projectId,
    driverId: cur?.driverId,
    supervisor: cur?.supervisor,
    location: cur?.location,
    startDate: cur?.startDate,
    endDate: cur?.endDate,
    notes: cur?.notes,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Vehicle, val: unknown) =>
    setV((p) => ({ ...p, [k]: val === "" ? undefined : val }));

  const usedAssets = new Set(
    db.vehicles.filter((x) => !x.deleted && x.id !== v.id && x.assetId).map((x) => x.assetId),
  );
  const assets = db.assets.filter(
    (x) => !x.deleted && x.group === "Vehicle" && (!usedAssets.has(x.id) || x.id === v.assetId),
  );

  const submit = () => {
    const e = validateVehicle(v, isNew);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      document
        .getElementById(`f-${Object.keys(e)[0]}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const vehicle = {
      ...v,
      id: v.id!.trim(),
      name: v.name || `${v.make} ${v.model}`,
      createdAt: v.createdAt ?? new Date().toISOString(),
    } as Vehicle;
    saveVehicle(vehicle, isNew, a);
    toast.success(`Vehicle ${vehicle.id} ${isNew ? "created" : "saved"}`);
    nav({ to: "/vehicles/$id", params: { id: vehicle.id } });
  };

  const o = (arr: readonly string[]) => arr.map((x) => ({ v: x, l: x }));
  const grid = "grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <Ctx.Provider value={{ v, set, errors, isNew }}>
      <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 space-y-1 text-sm">
            {SECTIONS.map(([id, l]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-md px-3 py-1.5 text-muted-foreground hover:bg-card hover:text-foreground"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-5">
          <Card id="general" title="General Information">
            <div className={grid}>
              <F k="id" label="Vehicle ID" req />
              <F k="assetId" label="Asset ID">
                <Sel
                  value={v.assetId}
                  onChange={(x) => set("assetId", x)}
                  opts={assets.map((x) => ({ v: x.id, l: `${x.id} · ${x.name}` }))}
                  invalid={!!errors.assetId}
                />
              </F>
              <F k="name" label="Vehicle Name" />
              <F k="type" label="Vehicle Type">
                <Sel
                  value={v.type}
                  onChange={(x) => set("type", x)}
                  opts={o(VEHICLE_TYPES)}
                  none={false}
                />
              </F>
              <F k="make" label="Manufacturer / Make" req />
              <F k="model" label="Model" req />
              <F k="year" label="Year" type="number" />
              <F k="vin" label="VIN" />
              <F k="plate" label="License Plate Number" />
              <F k="stateRegistered" label="State Registered" />
              <F k="mileage" label="Current Mileage" type="number" />
              <F k="fuelType" label="Fuel Type">
                <Sel value={v.fuelType} onChange={(x) => set("fuelType", x)} opts={o(FUEL_TYPES)} />
              </F>
              <F k="fuelCard" label="Fuel Card Number" />
              <F k="gpsId" label="GPS / Tracking ID" />
              <F k="location" label="Current Location" />
              <F k="status" label="Status" req>
                <Sel
                  value={v.status}
                  onChange={(x) => set("status", x)}
                  opts={o(VEHICLE_STATUSES)}
                  none={false}
                  invalid={!!errors.status}
                />
              </F>
              <F k="photo" label="Vehicle Photo" full>
                <div className="flex items-center gap-4">
                  {v.photo ? (
                    <div className="relative">
                      <img
                        src={v.photo}
                        alt="Vehicle"
                        className="h-20 w-32 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => set("photo", undefined)}
                        className="absolute -right-2 -top-2 rounded-full bg-foreground p-0.5 text-background"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    className="max-w-xs"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 1_000_000) return toast.error("Image must be under 1 MB");
                      const r = new FileReader();
                      r.onload = () => set("photo", r.result);
                      r.readAsDataURL(f);
                    }}
                  />
                </div>
              </F>
            </div>
          </Card>

          <Card id="ownership" title="Ownership">
            <div className={grid}>
              <F k="ownershipType" label="Ownership Type">
                <Sel
                  value={v.ownershipType}
                  onChange={(x) => set("ownershipType", x)}
                  opts={o(OWNERSHIP_TYPES)}
                  none={false}
                />
              </F>
              <F k="ownerId" label="Owner">
                <Sel
                  value={v.ownerId}
                  onChange={(x) => set("ownerId", x)}
                  opts={db.owners.filter((x) => !x.deleted).map((x) => ({ v: x.id, l: x.name }))}
                />
              </F>
              <F k="vendor" label="Vendor / Lessor" />
              <F k="purchaseDate" label="Purchase Date" type="date" />
              <F k="purchasePrice" label="Purchase Price ($)" type="number" />
              <F k="leaseStart" label="Lease Start Date" type="date" />
              <F k="leaseEnd" label="Lease End Date" type="date" />
              <F k="monthlyLease" label="Monthly Lease Cost ($)" type="number" />
            </div>
          </Card>

          <Card id="assignment" title="Assignment">
            <p className="px-5 pt-4 text-xs text-muted-foreground">
              A vehicle can have one active project assignment. Changing these values closes the
              current assignment and keeps it in history.
            </p>
            <div className={grid}>
              <div>
                <Label className="mb-1.5 block text-xs">Assigned Project</Label>
                <Sel
                  value={a.projectId}
                  onChange={(x) => setA({ ...a, projectId: x })}
                  opts={db.projects
                    .filter((p) => !p.deleted && ["Active", "New", "On Hold"].includes(p.status))
                    .map((p) => ({ v: p.id, l: `${p.id} · ${p.name}` }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Assigned Driver</Label>
                <Sel
                  value={a.driverId}
                  onChange={(x) => setA({ ...a, driverId: x })}
                  opts={db.drivers
                    .filter((p) => !p.deleted && p.status === "Active")
                    .map((p) => ({ v: p.id, l: p.name }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Supervisor</Label>
                <Input
                  value={a.supervisor ?? ""}
                  onChange={(e) => setA({ ...a, supervisor: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Site / Location</Label>
                <Input
                  value={a.location ?? ""}
                  onChange={(e) => setA({ ...a, location: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Assignment Start Date</Label>
                <Input
                  type="date"
                  value={a.startDate ?? ""}
                  onChange={(e) => setA({ ...a, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Assignment End Date</Label>
                <Input
                  type="date"
                  value={a.endDate ?? ""}
                  onChange={(e) => setA({ ...a, endDate: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="mb-1.5 block text-xs">Assignment Notes</Label>
                <Textarea
                  rows={2}
                  value={a.notes ?? ""}
                  onChange={(e) => setA({ ...a, notes: e.target.value })}
                />
              </div>
            </div>
          </Card>

          <Card id="compliance" title="Compliance">
            <div className={grid}>
              <F k="regNumber" label="Registration Number" />
              <F k="regState" label="Registration State" />
              <F k="regExpiry" label="Registration Expiry" type="date" />
              <F k="insProvider" label="Insurance Provider" />
              <F k="insPolicy" label="Policy Number" />
              <F k="insExpiry" label="Insurance Expiry" type="date" />
              <F k="inspDate" label="Inspection Date" type="date" />
              <F k="inspExpiry" label="Inspection Expiry" type="date" />
              <div />
              <F k="permitNumber" label="Permit Number" />
              <F k="permitExpiry" label="Permit Expiry" type="date" />
            </div>
            <div className="flex flex-wrap gap-3 border-t px-5 py-3 text-xs">
              {complianceItems(v as Vehicle).map((c) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  {c.label}:{" "}
                  <StatusBadge status={expiryStatus(c.date, db.company.expiryWarningDays)} />
                </span>
              ))}
            </div>
          </Card>

          <Card id="financial" title="Financial">
            <div className={grid}>
              <F k="currentValue" label="Current Value ($)" type="number" />
              <F k="monthlyPayment" label="Monthly Payment ($)" type="number" />
              <F k="financialNotes" label="Notes" full>
                <Textarea
                  rows={2}
                  value={v.financialNotes ?? ""}
                  onChange={(e) => set("financialNotes", e.target.value)}
                />
              </F>
            </div>
            <p className="px-5 pb-4 text-xs text-muted-foreground">
              Purchase price, purchase date, lease cost and vendor are captured in Ownership.
            </p>
          </Card>

          <div className="sticky bottom-0 flex justify-end gap-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
            <Button variant="outline" asChild>
              <Link to={isNew ? "/vehicles" : "/vehicles/$id"} params={{ id: v.id ?? "" }}>
                Cancel
              </Link>
            </Button>
            <Button onClick={submit}>{isNew ? "Create Vehicle" : "Save Changes"}</Button>
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}
