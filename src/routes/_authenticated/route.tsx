import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Truck,
  Boxes,
  IdCard,
  Building2,
  FolderKanban,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronsLeft,
  Menu,
  Search,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSession, logout, roleLabel, useSession, logActivity } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!getSession()) throw redirect({ to: "/login" });
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: Gauge },
  { to: "/vehicles", label: "Fleet Register", icon: CarFront },
  { to: "/assets", label: "Equipment", icon: PackageSearch },
  { to: "/drivers", label: "Operators", icon: ContactRound },
  { to: "/owners", label: "Partners", icon: Handshake },
  { to: "/projects", label: "Operations", icon: MapPinned },
  { to: "/maintenance", label: "Service Center", icon: Wrench },
  { to: "/documents", label: "Records", icon: FolderOpen },
  { to: "/reports", label: "Insights", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Workspace", icon: SlidersHorizontal },
] as const;

function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [q, setQ] = useState("");
  const session = useSession();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const segs = path.split("/").filter(Boolean);
  const section = NAV.find((n) => path.startsWith(n.to));

  const doLogout = () => {
    logActivity("logged out", "Auth", session?.username ?? "");
    logout();
    nav({ to: "/login", replace: true });
  };

  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4",
          mini && "justify-center px-0",
        )}
      >
        <img src="/fleetmark.svg" alt="Fleet Ops" className="h-8 w-8 shrink-0" />
        {!mini && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-accent-foreground">
              Fleet Ops
            </div>
            <div className="text-[11px] uppercase tracking-widest">OPERATIONS PLATFORM</div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((n) => {
          const active = path.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobile(false)}
              title={n.label}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                mini && "justify-center px-0",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                  : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <n.icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} />
              {!mini && n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-2.5", mini && "flex-col")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {session?.displayName.slice(0, 2).toUpperCase()}
          </div>
          {!mini && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm text-sidebar-accent-foreground">
                {session?.displayName}
              </div>
              <div className="text-[11px]">{session && roleLabel[session.role]}</div>
            </div>
          )}
          <button
            onClick={doLogout}
            aria-label="Log out"
            title="Log out"
            className="rounded-md p-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 transition-[width] md:block",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {sidebar(collapsed)}
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          {sidebar(false)}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur">
          <button
            className="rounded-md p-1.5 hover:bg-muted md:hidden"
            onClick={() => setMobile(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            className="hidden rounded-md p-1.5 hover:bg-muted md:block"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft
              className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")}
            />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{section?.label ?? "Dashboard"}</div>
            <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <Link to="/dashboard" className="hover:text-foreground">
                Home
              </Link>
              {segs.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {i < segs.length - 1 ? (
                    <a
                      href={"/" + segs.slice(0, i + 1).join("/")}
                      className="capitalize hover:text-foreground"
                    >
                      {s}
                    </a>
                  ) : (
                    <span className="capitalize text-foreground">{decodeURIComponent(s)}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <form
            className="ml-auto hidden w-72 lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              nav({ to: "/vehicles", search: { q } });
            }}
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find unit, VIN or plate…"
                className="h-9 bg-muted/60 pl-8"
              />
            </div>
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-auto flex items-center gap-2 rounded-md p-1 hover:bg-muted lg:ml-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {session?.displayName.slice(0, 2).toUpperCase()}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div>{session?.displayName}</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {session && roleLabel[session.role]}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: "/settings" })}>
                <User className="mr-2 h-4 w-4" />
                Profile & settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
