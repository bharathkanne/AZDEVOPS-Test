import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSession, login } from "@/lib/store";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Vehicle Management CMS" },
      { name: "description", content: "Sign in to manage your fleet vehicles and assets." },
      { property: "og:title", content: "Sign in — Vehicle Management CMS" },
      { property: "og:description", content: "Sign in to manage your fleet vehicles and assets." },
    ],
  }),
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(false);
  const [fEmail, setFEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !pw) return setErr("Enter your username and password.");
    setBusy(true);
    setErr("");
    const ok = await login(u, pw, remember);
    setBusy(false);
    if (!ok) return setErr("Invalid username or password.");
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 text-sidebar-accent-foreground">
          <img src="/fleetmark.svg" alt="Vehicle Management" className="h-9 w-9" />
          <span className="font-semibold">Vehicle Management CMS</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
            Know where every vehicle is, who drives it, and what it needs next.
          </h2>
          <p className="mt-4 text-sm leading-relaxed">
            Ownership, assignments, compliance expiries and maintenance history — one record per
            vehicle, from asset to retirement.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-sidebar-border pt-6 text-xs">
          {["Assignments", "Compliance", "Maintenance"].map((t) => (
            <div key={t}>
              <div className="mb-2 h-0.5 w-8 bg-primary" />
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your fleet account to continue.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u">Username</Label>
            <Input
              id="u"
              autoComplete="username"
              value={u}
              onChange={(e) => setU(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Password</Label>
            <div className="relative">
              <Input
                id="p"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
                className="absolute right-2.5 top-2.5 text-muted-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
              Remember me
            </label>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setForgot(true)}
            >
              Forgot password?
            </button>
          </div>
          {err && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Need an account? Contact your administrator.
          </p>
        </form>
      </div>
      <Dialog open={forgot} onOpenChange={setForgot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Enter your account email and an administrator will send reset instructions.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="email"
            placeholder="you@company.com"
            value={fEmail}
            onChange={(e) => setFEmail(e.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!/^\S+@\S+\.\S+$/.test(fEmail)) return toast.error("Enter a valid email");
                toast.success("Reset request sent to your administrator");
                setForgot(false);
                setFEmail("");
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
