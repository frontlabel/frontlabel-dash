import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Palette,
  LogOut,
  Menu,
  User,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ShellHeaderProvider, useShellHeader } from "@/components/shell-header-context";
import { useIsAdmin } from "@/hooks/use-is-admin";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const isAdmin = useIsAdmin();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id,name")
      .order("name")
      .then(({ data }) => setShops((data as Array<{ id: string; name: string }> | null) ?? []));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const activeShopId = pathname.match(/^\/shops\/([^/]+)/)?.[1] ?? null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navLinkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition-colors",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );

  const iconClass = (active: boolean) =>
    cn(
      "size-5 shrink-0",
      active ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground",
    );

  const sidebarBody = (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <img
          src="https://frontlabel.nl/wp-content/uploads/2025/10/frontlabel-logo-white@3x.png"
          alt="Frontlabel"
          className="h-7 w-auto object-contain brightness-0"
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {nav.map((item) => {
                const active =
                  pathname === item.to ||
                  pathname.startsWith(item.to + "/") ||
                  (item.to === "/dashboard" && pathname.startsWith("/shops"));
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass(active)}
                    >
                      <Icon className={iconClass(active)} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              {isAdmin && (
                <li>
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={navLinkClass(pathname.startsWith("/admin"))}
                  >
                  <Shield className={iconClass(pathname.startsWith("/admin"))} />
                    Superadmin
                  </Link>
                </li>
              )}
            </ul>
          </li>

          {shops.length > 0 && (
            <li>
              <div className="text-xs/6 font-semibold text-muted-foreground">
                Jouw shops
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {shops.map((s) => {
                  const active = activeShopId === s.id;
                  return (
                    <li key={s.id}>
                      <Link
                        to="/shops/$shopId"
                        params={{ shopId: s.id }}
                        onClick={() => setMobileOpen(false)}
                        className={navLinkClass(active)}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg border bg-sidebar text-[0.625rem] font-medium",
                            active
                              ? "border-sidebar-ring text-sidebar-accent-foreground"
                              : "border-sidebar-border text-muted-foreground group-hover:border-sidebar-ring group-hover:text-sidebar-accent-foreground",
                          )}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{s.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          )}

          <li className="-mx-6 mt-auto border-t border-sidebar-border">
            <Link
              to="/account"
              search={{ tab: "profile" }}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {(email ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className="sr-only">Jouw profiel</span>
              <span aria-hidden="true" className="truncate">
                {email ?? "Account"}
              </span>
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-5 shrink-0 text-muted-foreground" />
              Uitloggen
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-xs p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
        >
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          {sidebarBody}
        </SheetContent>
      </Sheet>

      {/* Static sidebar for desktop */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col text-sidebar-foreground"
      >
        {sidebarBody}
      </div>

      <ShellHeaderProvider>
        <div className="lg:pl-72 flex min-h-screen flex-col">
          <HeaderBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <main className="flex-1">{children}</main>
        </div>
      </ShellHeaderProvider>
    </div>
  );
}

function HeaderBar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { content } = useShellHeader();
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center",
        content
          ? "h-14 border-b border-border bg-card"
          : "h-14 lg:hidden border-b border-border bg-card",
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden -m-2.5 inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>
        {content ? <div className="flex-1 min-w-0">{content}</div> : null}
      </div>
    </header>
  );
}