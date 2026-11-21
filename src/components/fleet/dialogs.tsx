import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDB, nextId, useDB } from "@/lib/store";
import { SERVICE_TYPES, activeAssignment } from "@/lib/fleet";
import { assignVehicle, upsert } from "@/lib/actions";
import type { Maintenance } from "@/lib/types";

function Sel({
  value,
  onChange,
  opts,
  none = true,
}: {
  value?: string;
  onChange: (v: string) => void;
  opts: { v: string; l: string }[];
  none?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={(x) => onChange(x === "__none" ? "" : x)}>
      <SelectTrigger>
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
}

export function AssignDialog({
  vehicleId,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const db = useDB();
  const cur = activeAssignment(db, vehicleId);
  const [a, setA] = useState({
    projectId: cur?.projectId ?? "",
    driverId: cur?.driverId ?? "",
    supervisor: cur?.supervisor ?? "",
    location: cur?.location ?? "",
    startDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {vehicleId}</DialogTitle>
          <DialogDescription>
            The current assignment will be closed and kept in history.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">Project</Label>
            <Sel
              value={a.projectId}
              onChange={(x) => setA({ ...a, projectId: x })}
              opts={db.projects
                .filter((p) => !p.deleted && ["Active", "New", "On Hold"].includes(p.status))
                .map((p) => ({ v: p.id, l: `${p.id} · ${p.name}` }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Driver</Label>
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
              value={a.supervisor}
              onChange={(e) => setA({ ...a, supervisor: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Location</Label>
            <Input value={a.location} onChange={(e) => setA({ ...a, location: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Start Date</Label>
            <Input
              type="date"
              value={a.startDate}
              onChange={(e) => setA({ ...a, startDate: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={a.notes}
              onChange={(e) => setA({ ...a, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          {cur && (
            <Button
              variant="outline"
              className="mr-auto"
              onClick={() => {
                assignVehicle(vehicleId, {});
                toast.success("Vehicle unassigned");
                onOpenChange(false);
              }}
            >
              Unassign
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!a.projectId && !a.driverId) return toast.error("Select a project or driver");
              assignVehicle(vehicleId, a);
              toast.success("Assignment saved");
              onOpenChange(false);
            }}
          >
            Save Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceDialog({
  vehicleId,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const v = getDB().vehicles.find((x) => x.id === vehicleId);
  const [m, setM] = useState<Partial<Maintenance>>({
    serviceDate: new Date().toISOString().slice(0, 10),
    serviceType: "Preventive Maintenance",
    mileage: v?.mileage,
    status: "Completed",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: keyof Maintenance, val: unknown) => setM({ ...m, [k]: val });
  const save = () => {
    const e: Record<string, string> = {};
    if (!m.serviceDate) e.serviceDate = "Required";
    if (!m.serviceType) e.serviceType = "Required";
    if (m.cost != null && m.cost < 0) e.cost = "Cannot be negative";
    setErr(e);
    if (Object.keys(e).length) return;
    const id = nextId(
      "MT-",
      getDB().maintenance.map((x) => x.id),
    );
    upsert("maintenance", { ...m, id, vehicleId } as Maintenance, true);
    toast.success(`Maintenance ${id} added`);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Maintenance · {vehicleId}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">Service Date *</Label>
            <Input
              type="date"
              value={m.serviceDate ?? ""}
              onChange={(e) => set("serviceDate", e.target.value)}
            />
            {err.serviceDate && <p className="text-xs text-destructive">{err.serviceDate}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Service Type *</Label>
            <Sel
              none={false}
              value={m.serviceType}
              onChange={(x) => set("serviceType", x)}
              opts={SERVICE_TYPES.map((s) => ({ v: s, l: s }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Mileage</Label>
            <Input
              type="number"
              value={m.mileage ?? ""}
              onChange={(e) => set("mileage", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Cost ($)</Label>
            <Input
              type="number"
              value={m.cost ?? ""}
              onChange={(e) => set("cost", e.target.value ? Number(e.target.value) : undefined)}
            />
            {err.cost && <p className="text-xs text-destructive">{err.cost}</p>}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Vendor</Label>
            <Input value={m.vendor ?? ""} onChange={(e) => set("vendor", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Next Service Date</Label>
            <Input
              type="date"
              value={m.nextServiceDate ?? ""}
              onChange={(e) => set("nextServiceDate", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Status</Label>
            <Sel
              none={false}
              value={m.status}
              onChange={(x) => set("status", x)}
              opts={["Completed", "In Progress", "Scheduled"].map((s) => ({ v: s, l: s }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Description</Label>
            <Textarea
              rows={2}
              value={m.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Parts / Work Performed</Label>
            <Textarea
              rows={2}
              value={m.parts ?? ""}
              onChange={(e) => set("parts", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={m.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Add Record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
