import type { DB, Vehicle } from "./types";

export type ExpiryStatus = "Valid" | "Expiring Soon" | "Expired" | "N/A";

export function daysUntil(date?: string) {
  if (!date) return null;
  const t = new Date(date + "T00:00:00").getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((t - now.getTime()) / 86400000);
}

export function expiryStatus(date?: string, warn = 30): ExpiryStatus {
  const n = daysUntil(date);
  if (n === null) return "N/A";
  if (n < 0) return "Expired";
  if (n <= warn) return "Expiring Soon";
  return "Valid";
}

export function activeAssignment(db: DB, vehicleId: string) {
  return db.assignments.find((a) => a.vehicleId === vehicleId && a.active);
}

export function vehicleView(db: DB, v: Vehicle) {
  const a = activeAssignment(db, v.id);
  return {
    ...v,
    ownerName: db.owners.find((o) => o.id === v.ownerId)?.name ?? "",
    driverName: db.drivers.find((x) => x.id === a?.driverId)?.name ?? "",
    driverId: a?.driverId,
    projectId: a?.projectId,
    projectName: db.projects.find((p) => p.id === a?.projectId)?.name ?? "",
    currentLocation: a?.location || v.location || "",
    assignment: a,
  };
}
export type VehicleView = ReturnType<typeof vehicleView>;

export const liveVehicles = (db: DB) => db.vehicles.filter((v) => !v.deleted);

export function complianceItems(v: Vehicle) {
  return [
    { label: "Registration", date: v.regExpiry, ref: v.regNumber },
    { label: "Insurance", date: v.insExpiry, ref: v.insPolicy },
    {
      label: "Inspection",
      date: v.inspExpiry,
      ref: v.inspDate ? `Inspected ${fmtDate(v.inspDate)}` : undefined,
    },
    { label: "Permit", date: v.permitExpiry, ref: v.permitNumber },
  ];
}

export function maintenanceSummary(db: DB, vehicleId: string) {
  const recs = db.maintenance
    .filter((m) => m.vehicleId === vehicleId && !m.deleted)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  const done = recs.filter((r) => r.status !== "Scheduled");
  const last = done[0];
  const nexts = recs.map((r) => r.nextServiceDate).filter(Boolean) as string[];
  const latestNext = last?.nextServiceDate ?? nexts.sort().reverse()[0];
  const total = recs.reduce((s, r) => s + (r.cost ?? 0), 0);
  const repairs = recs.filter((r) =>
    ["Repair", "Engine", "Brake", "Electrical"].includes(r.serviceType),
  ).length;
  const due = latestNext ? (daysUntil(latestNext) ?? 1) < 0 : false;
  return { recs, last, next: latestNext, total, repairs, due };
}

export const fmtDate = (s?: string) =>
  s
    ? new Date(s.length === 10 ? s + "T00:00:00" : s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
export const fmtMoney = (n?: number) =>
  n == null || isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString("en-US"));

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    keys.map(esc).join(","),
    ...rows.map((r) => keys.map((k) => esc(r[k])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const VEHICLE_STATUSES = [
  "Active",
  "Idle",
  "Under Repair",
  "Maintenance",
  "Inactive",
] as const;
export const OWNERSHIP_TYPES = ["Company Owned", "Leased", "Rented"] as const;
export const VEHICLE_TYPES = [
  "Truck",
  "Pickup",
  "Van",
  "Trailer",
  "Excavator",
  "Service Vehicle",
  "Other",
];
export const FUEL_TYPES = ["Diesel", "Gasoline", "Electric", "Hybrid", "Other"];
export const SERVICE_TYPES = [
  "Preventive Maintenance",
  "Oil Change",
  "Tire",
  "Brake",
  "Engine",
  "Electrical",
  "Repair",
  "Inspection",
  "Other",
];
export const DOC_TYPES = [
  "Registration",
  "Insurance",
  "Inspection",
  "Title",
  "Purchase Invoice",
  "Lease Agreement",
  "Maintenance Invoice",
  "Permit",
  "Other",
];
export const ASSET_GROUPS = ["Vehicle", "Equipment", "Machinery", "Tools", "Other"];
