import { getDB, logActivity, update } from "./store";
import { activeAssignment } from "./fleet";
import type { Vehicle } from "./types";

export interface AssignInput {
  projectId?: string;
  driverId?: string;
  supervisor?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export function validateVehicle(v: Partial<Vehicle>, isNew: boolean) {
  const db = getDB();
  const e: Record<string, string> = {};
  if (!v.id?.trim()) e.id = "Vehicle ID is required";
  if (!v.make?.trim()) e.make = "Make is required";
  if (!v.model?.trim()) e.model = "Model is required";
  if (!v.status) e.status = "Status is required";
  if (isNew && db.vehicles.some((x) => x.id.toLowerCase() === v.id?.trim().toLowerCase()))
    e.id = "Vehicle ID already exists";
  const live = db.vehicles.filter((x) => !x.deleted && x.id !== v.id);
  if (v.vin && live.some((x) => x.vin?.toLowerCase() === v.vin!.toLowerCase()))
    e.vin = "VIN is already used by another vehicle";
  if (v.plate && live.some((x) => x.plate?.toLowerCase() === v.plate!.toLowerCase()))
    e.plate = "Plate number is already used";
  if (v.assetId) {
    const used = live.find((x) => x.assetId === v.assetId);
    if (used) e.assetId = `Asset is already linked to ${used.id}`;
  }
  if (v.year && (v.year < 1950 || v.year > new Date().getFullYear() + 1))
    e.year = "Enter a valid year";
  if (v.mileage != null && v.mileage < 0) e.mileage = "Mileage cannot be negative";
  return e;
}

export function saveVehicle(v: Vehicle, isNew: boolean, assign?: AssignInput) {
  update((d) => ({
    ...d,
    vehicles: isNew
      ? [...d.vehicles, { ...v, createdAt: new Date().toISOString() }]
      : d.vehicles.map((x) => (x.id === v.id ? v : x)),
  }));
  logActivity(`${isNew ? "created" : "updated"} vehicle ${v.id}`, "Vehicles", v.id);
  if (assign) assignVehicle(v.id, assign, true);
}

export function assignVehicle(vehicleId: string, a: AssignInput, onlyIfChanged = false) {
  const db = getDB();
  const cur = activeAssignment(db, vehicleId);
  const norm = (s?: string) => s || "";
  const changed = !cur
    ? !!(a.projectId || a.driverId)
    : norm(cur.projectId) !== norm(a.projectId) ||
      norm(cur.driverId) !== norm(a.driverId) ||
      norm(cur.supervisor) !== norm(a.supervisor) ||
      norm(cur.location) !== norm(a.location) ||
      norm(cur.notes) !== norm(a.notes) ||
      norm(cur.endDate) !== norm(a.endDate);
  if (onlyIfChanged && !changed) return false;
  const today = new Date().toISOString().slice(0, 10);
  // a driver can only drive one vehicle at a time — release them from others
  update((d) => ({
    ...d,
    assignments: [
      ...d.assignments.map((x) =>
        x.active && (x.vehicleId === vehicleId || (a.driverId && x.driverId === a.driverId))
          ? x.vehicleId === vehicleId
            ? { ...x, active: false, endDate: x.endDate && x.endDate < today ? x.endDate : today }
            : { ...x, driverId: undefined }
          : x,
      ),
      ...(a.projectId || a.driverId
        ? [
            {
              id: crypto.randomUUID(),
              vehicleId,
              projectId: a.projectId || undefined,
              driverId: a.driverId || undefined,
              supervisor: a.supervisor,
              location: a.location,
              startDate: a.startDate || today,
              endDate: a.endDate || undefined,
              notes: a.notes,
              active: true,
            },
          ]
        : []),
    ],
    vehicles: a.location
      ? d.vehicles.map((v) => (v.id === vehicleId ? { ...v, location: a.location } : v))
      : d.vehicles,
  }));
  logActivity(
    a.projectId || a.driverId
      ? `assigned ${vehicleId} to ${a.projectId ? `Project ${a.projectId}` : `driver ${a.driverId}`}`
      : `unassigned ${vehicleId}`,
    "Assignments",
    vehicleId,
  );
  return true;
}

export function deleteVehicle(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  update((d) => ({
    ...d,
    vehicles: d.vehicles.map((v) =>
      v.id === id ? { ...v, deleted: true, assetId: undefined, vin: v.vin, status: "Inactive" } : v,
    ),
    assignments: d.assignments.map((a) =>
      a.vehicleId === id && a.active ? { ...a, active: false, endDate: today } : a,
    ),
  }));
  logActivity(`deleted vehicle ${id}`, "Vehicles", id);
}

type Coll = "owners" | "drivers" | "projects" | "assets" | "maintenance" | "documents";
const label: Record<Coll, string> = {
  owners: "owner",
  drivers: "driver",
  projects: "project",
  assets: "asset",
  maintenance: "maintenance record",
  documents: "document",
};
const mod: Record<Coll, string> = {
  owners: "Owners",
  drivers: "Drivers",
  projects: "Projects",
  assets: "Assets",
  maintenance: "Maintenance",
  documents: "Documents",
};

export function upsert<T extends { id: string }>(coll: Coll, row: T, isNew: boolean) {
  const db = getDB() as unknown as Record<Coll, T[]>;
  if (isNew && db[coll].some((x) => x.id.toLowerCase() === row.id.toLowerCase()))
    return `ID ${row.id} already exists`;
  update((d) => {
    const list = d[coll] as unknown as T[];
    return { ...d, [coll]: isNew ? [...list, row] : list.map((x) => (x.id === row.id ? row : x)) };
  });
  logActivity(`${isNew ? "added" : "updated"} ${label[coll]} ${row.id}`, mod[coll], row.id);
}

export function softDelete(coll: Coll, id: string) {
  update((d) => ({
    ...d,
    [coll]: (d[coll] as unknown as { id: string }[]).map((x) =>
      x.id === id ? { ...x, deleted: true } : x,
    ),
  }));
  logActivity(`deleted ${label[coll]} ${id}`, mod[coll], id);
}
