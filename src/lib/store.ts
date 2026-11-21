import { useSyncExternalStore } from "react";
import { seed } from "./seed";
import type { DB, Role, User } from "./types";

const KEY = "vmcms-db-v1";
const SESSION = "vmcms-session";
let db: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (db) return db;
  if (typeof window === "undefined") return (db = seed());
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? (JSON.parse(raw) as DB) : seed();
  } catch {
    db = seed();
  }
  return db;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* quota */
  }
}

export function getDB() {
  return load();
}

export function update(fn: (draft: DB) => DB) {
  db = fn(load());
  persist();
  listeners.forEach((l) => l());
}

export function resetDemoData() {
  db = seed();
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, load, load);
}

// ---------- auth ----------
export type Session = Omit<User, "passwordHash">;

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION) ?? sessionStorage.getItem(SESSION);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Session;
    const u = load().users.find((x) => x.username === s.username);
    if (!u) return null;
    const { passwordHash: _p, ...rest } = u;
    return rest;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string, remember: boolean) {
  const u = load().users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u || u.passwordHash !== (await sha256(password))) return false;
  const { passwordHash: _p, ...s } = u;
  (remember ? localStorage : sessionStorage).setItem(SESSION, JSON.stringify(s));
  logActivity("logged in", "Auth", u.username, u.displayName);
  return true;
}

export function logout() {
  localStorage.removeItem(SESSION);
  sessionStorage.removeItem(SESSION);
}

export function useSession() {
  // re-render on db changes (profile edits)
  useDB();
  return getSession();
}

export type Action = "read" | "write" | "admin";
export function can(role: Role | undefined, action: Action) {
  if (!role) return false;
  if (action === "read") return true;
  if (action === "write") return role === "ADMIN" || role === "FLEET_MANAGER";
  return role === "ADMIN";
}

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrator",
  FLEET_MANAGER: "Fleet Manager",
  VIEWER: "Viewer",
};

export function logActivity(action: string, module: string, record: string, userName?: string) {
  const user = userName ?? getSession()?.displayName ?? "System";
  update((d) => ({
    ...d,
    activity: [
      { id: crypto.randomUUID(), user, action, module, record, at: new Date().toISOString() },
      ...d.activity,
    ].slice(0, 300),
  }));
}

export function nextId(prefix: string, ids: string[], pad = 3) {
  const n = ids.map((i) => parseInt(i.replace(/\D/g, ""), 10)).filter((x) => !isNaN(x));
  return `${prefix}${String((n.length ? Math.max(...n) : 0) + 1).padStart(pad, "0")}`;
}
