import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Panel, td, th, useConfirm } from "@/components/fleet/common";
import {
  can,
  getDB,
  logActivity,
  resetDemoData,
  roleLabel,
  sha256,
  update,
  useDB,
  useSession,
} from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Fleet Ops" },
      {
        name: "description",
        content: "Company information, user profile and application settings.",
      },
      { property: "og:title", content: "Settings" },
      { property: "og:description", content: "Application settings." },
    ],
  }),
  component: Page,
});

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Page() {
  const session = useSession();
  if (!session) return null; // signed out mid-render (e.g. logout from this page)
  return <SettingsBody session={session} />;
}

function SettingsBody({ session }: { session: NonNullable<ReturnType<typeof useSession>> }) {
  const db = useDB();
  const isAdmin = can(session.role, "admin");
  const [co, setCo] = useState(db.company);
  const [prof, setProf] = useState({ displayName: session.displayName, email: session.email });
  const [pw, setPw] = useState({ cur: "", next: "", confirm: "" });
  const { confirm, node } = useConfirm();

  const saveCompany = () => {
    if (!co.name.trim()) return toast.error("Company name is required");
    if (co.expiryWarningDays < 1 || co.expiryWarningDays > 365)
      return toast.error("Warning days must be 1–365");
    update((d) => ({
      ...d,
      company: { ...co, pageSize: Math.max(5, Math.min(100, Number(co.pageSize) || 10)) },
    }));
    logActivity("updated settings", "Settings", "Company");
    toast.success("Settings saved");
  };
  const saveProfile = () => {
    if (!prof.displayName.trim()) return toast.error("Display name is required");
    if (!/^\S+@\S+\.\S+$/.test(prof.email)) return toast.error("Enter a valid email");
    update((d) => ({
      ...d,
      users: d.users.map((u) => (u.username === session.username ? { ...u, ...prof } : u)),
    }));
    toast.success("Profile updated");
  };
  const changePw = async () => {
    const u = getDB().users.find((x) => x.username === session.username)!;
    if (u.passwordHash !== (await sha256(pw.cur)))
      return toast.error("Current password is incorrect");
    if (pw.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    const h = await sha256(pw.next);
    update((d) => ({
      ...d,
      users: d.users.map((x) => (x.username === u.username ? { ...x, passwordHash: h } : x)),
    }));
    logActivity("changed password", "Settings", u.username);
    setPw({ cur: "", next: "", confirm: "" });
    toast.success("Password changed");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="User Profile">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <L label="Username">
              <Input value={session.username} disabled />
            </L>
            <L label="Role">
              <Input value={roleLabel[session.role]} disabled />
            </L>
            <L label="Display Name">
              <Input
                value={prof.displayName}
                onChange={(e) => setProf({ ...prof, displayName: e.target.value })}
              />
            </L>
            <L label="Email">
              <Input
                type="email"
                value={prof.email}
                onChange={(e) => setProf({ ...prof, email: e.target.value })}
              />
            </L>
            <div className="sm:col-span-2">
              <Button onClick={saveProfile}>Save Profile</Button>
            </div>
          </div>
        </Panel>
        <Panel title="Change Password">
          <div className="grid gap-4 p-5">
            <L label="Current Password">
              <Input
                type="password"
                autoComplete="current-password"
                value={pw.cur}
                onChange={(e) => setPw({ ...pw, cur: e.target.value })}
              />
            </L>
            <L label="New Password">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
              />
            </L>
            <L label="Confirm New Password">
              <Input
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              />
            </L>
            <div>
              <Button onClick={changePw}>Update Password</Button>
            </div>
          </div>
        </Panel>
        <Panel title="Company Information">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <L label="Company Name">
              <Input
                disabled={!isAdmin}
                value={co.name}
                onChange={(e) => setCo({ ...co, name: e.target.value })}
              />
            </L>
            <L label="Phone">
              <Input
                disabled={!isAdmin}
                value={co.phone}
                onChange={(e) => setCo({ ...co, phone: e.target.value })}
              />
            </L>
            <L label="Email">
              <Input
                disabled={!isAdmin}
                value={co.email}
                onChange={(e) => setCo({ ...co, email: e.target.value })}
              />
            </L>
            <L label="Address">
              <Input
                disabled={!isAdmin}
                value={co.address}
                onChange={(e) => setCo({ ...co, address: e.target.value })}
              />
            </L>
          </div>
        </Panel>
        <Panel title="Application Settings">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <L label="Compliance warning (days before expiry)">
              <Input
                type="number"
                disabled={!isAdmin}
                value={co.expiryWarningDays}
                onChange={(e) => setCo({ ...co, expiryWarningDays: Number(e.target.value) })}
              />
            </L>
            <L label="Vehicle list page size">
              <Input
                type="number"
                disabled={!isAdmin}
                value={co.pageSize}
                onChange={(e) => setCo({ ...co, pageSize: Number(e.target.value) })}
              />
            </L>
            {isAdmin ? (
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button onClick={saveCompany}>Save Settings</Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() =>
                    confirm(
                      "Reset all data?",
                      "This replaces every record in this browser with the original demo data.",
                      () => {
                        resetDemoData();
                        toast.success("Demo data restored");
                      },
                    )
                  }
                >
                  Reset demo data
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Only administrators can change company and application settings.
              </p>
            )}
          </div>
        </Panel>
      </div>
      {isAdmin && (
        <Panel title="Users & Roles">
          <CreateUser />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className={th}>Username</th>
                  <th className={th}>Display Name</th>
                  <th className={th}>Email</th>
                  <th className={th}>Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {db.users.map((u) => (
                  <tr key={u.username}>
                    <td className={td + " font-mono text-xs"}>{u.username}</td>
                    <td className={td}>{u.displayName}</td>
                    <td className={td}>{u.email}</td>
                    <td className={td}>{roleLabel[u.role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Administrators have full access · Fleet Managers can manage fleet records · Viewers are
            read-only.
          </p>
        </Panel>
      )}
      {node}
    </div>
  );
}

function CreateUser() {
  const empty = {
    username: "",
    displayName: "",
    email: "",
    role: "VIEWER" as Role,
    password: "",
    confirm: "",
  };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set =
    (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = f.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username))
      return toast.error("Username: 3–30 letters, numbers, . _ -");
    if (getDB().users.some((u) => u.username.toLowerCase() === username))
      return toast.error("Username already exists");
    if (!f.displayName.trim()) return toast.error("Display name is required");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast.error("Enter a valid email");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (f.password !== f.confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const passwordHash = await sha256(f.password);
    update((d) => ({
      ...d,
      users: [
        ...d.users,
        {
          username,
          displayName: f.displayName.trim(),
          email: f.email.trim(),
          role: f.role,
          passwordHash,
        },
      ],
    }));
    logActivity("created user", "Users", username);
    setF(empty);
    setBusy(false);
    toast.success(`User ${username} created`);
  };
  return (
    <form onSubmit={submit} className="grid gap-3 border-b p-4 sm:grid-cols-3">
      <p className="text-sm font-medium sm:col-span-3">Create account</p>
      <L label="Username *">
        <Input value={f.username} onChange={set("username")} />
      </L>
      <L label="Display name *">
        <Input value={f.displayName} onChange={set("displayName")} />
      </L>
      <L label="Email *">
        <Input type="email" value={f.email} onChange={set("email")} />
      </L>
      <L label="Role *">
        <select
          value={f.role}
          onChange={set("role")}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {(["ADMIN", "FLEET_MANAGER", "VIEWER"] as Role[]).map((r) => (
            <option key={r} value={r}>
              {roleLabel[r]}
            </option>
          ))}
        </select>
      </L>
      <L label="Password *">
        <Input
          type="password"
          autoComplete="new-password"
          value={f.password}
          onChange={set("password")}
        />
      </L>
      <L label="Confirm password *">
        <Input
          type="password"
          autoComplete="new-password"
          value={f.confirm}
          onChange={set("confirm")}
        />
      </L>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>
          Create User
        </Button>
      </div>
    </form>
  );
}
