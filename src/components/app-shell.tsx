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
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APPS_CATALOG, APP_TABS, type AppDefinition } from "@/lib/apps-catalog";

import { APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShellHeaderProvider, useShellHeaderContent } from "@/components/shell-header-context";
import { useIsAdmin } from "@/hooks/use-is-admin";

const AVATAR_COLORS = [
  "#e11d48",
  "#db2777",
  "#9333ea",
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#d97706",
  "#ea580c",
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}


const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  const isAdmin = useIsAdmin();
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0]!);

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
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setEmail(user?.email ?? null);
      if (!user) return;
      setAvatarColor(colorForId(user.id));
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setAvatarUrl((profile as { avatar_url: string | null } | null)?.avatar_url ?? null);
    });
  }, []);


  const activeShopId = pathname.match(/^\/shops\/([^/]+)/)?.[1] ?? null;
  const appShopId = activeShopId ?? shops[0]?.id ?? null;
  const activeAppSlug = pathname.match(/^\/shops\/[^/]+\/apps\/([^/]+)/)?.[1] ?? null;
  const currentTab = useRouterState({
    select: (s) => (s.location.search as { tab?: string }).tab,
  });

  useEffect(() => {
    if (!appShopId) {
      setInstalled({});
      return;
    }
    supabase
      .from("shop_apps")
      .select("app_slug,enabled")
      .eq("shop_id", appShopId)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        for (const row of (data as Array<{ app_slug: string; enabled: boolean }> | null) ?? []) {
          map[row.app_slug] = row.enabled;
        }
        setInstalled(map);
      });
  }, [appShopId]);


  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navLinkClass = (active: boolean) =>
    cn(
      "group flex items-center gap-x-3 rounded-md p-2 text-base/6 font-semibold transition-colors",
      active
        ? "bg-sidebar-active text-sidebar-active-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-hover",
    );

  const iconClass = (active: boolean) =>
    cn(
      "size-4 shrink-0",
      active ? "text-sidebar-active-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
    );

  const sidebarBody = (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-sidebar-border bg-sidebar px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <img
          src="https://frontlabel.nl/wp-content/uploads/2025/10/frontlabel-logo-white@3x.png"
          alt="Frontlabel"
          className="h-7 w-auto object-contain"
        />
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1.5">
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
            </ul>
          </li>

          {appShopId && (
            <li>
              <div className="text-xs/6 font-semibold text-sidebar-foreground/60">Apps</div>
              <ul role="list" className="-mx-2 mt-1.5 space-y-1.5">
                {[...APPS_CATALOG]
                  .sort((a, b) => {
                    const rank = (x: AppDefinition) =>
                      installed[x.slug] !== undefined ? 0 : x.status === "coming-soon" ? 2 : 1;
                    return rank(a) - rank(b);
                  })
                  .map((app) => {
                    const isInstalled = installed[app.slug] !== undefined;
                    const isEnabled = installed[app.slug] === true;
                    const active = activeAppSlug === app.slug;
                    const tabs = APP_TABS[app.slug] ?? [];
                    return (
                      <li key={app.slug}>
                        <Link
                          to="/shops/$shopId/apps/$appSlug"
                          params={{ shopId: appShopId, appSlug: app.slug }}
                          search={{}}
                          onClick={() => setMobileOpen(false)}
                          className={navLinkClass(active)}
                        >
                          <Package className={iconClass(active)} />
                          <span className="truncate">{app.name}</span>
                          {isInstalled ? (
                            <span
                              title={isEnabled ? "Actief" : "Geïnstalleerd, uit"}
                              className={cn(
                                "ml-auto size-2 shrink-0 rounded-full",
                                isEnabled ? "bg-emerald-400" : "bg-sidebar-foreground/40",
                              )}
                            />
                          ) : app.status === "coming-soon" ? (
                            <span className="ml-auto text-[10px] font-medium text-sidebar-foreground/40">
                              binnenkort
                            </span>
                          ) : null}
                        </Link>
                        {active && tabs.length > 0 && (
                          <ul role="list" className="mt-1 space-y-0.5 border-l border-sidebar-border pl-3 ml-4">
                            {tabs.map((t) => {
                              const tabActive = (currentTab ?? tabs[0]!.id) === t.id;
                              return (
                                <li key={t.id}>
                                  <Link
                                    to="/shops/$shopId/apps/$appSlug"
                                    params={{ shopId: appShopId, appSlug: app.slug }}
                                    search={{ tab: t.id }}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                      "block rounded-md px-2 py-1 text-sm transition-colors",
                                      tabActive
                                        ? "text-sidebar-active-foreground font-semibold"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground",
                                    )}
                                  >
                                    {t.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </li>
          )}



          {shops.length > 0 && (
            <li>
              <div className="text-xs/6 font-semibold text-sidebar-foreground/60">
                Jouw shops
              </div>
              <ul role="list" className="-mx-2 mt-1.5 space-y-1.5">
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
                              ? "border-sidebar-active text-sidebar-active-foreground"
                              : "border-sidebar-border text-sidebar-foreground/60 group-hover:border-sidebar-active group-hover:text-sidebar-foreground",
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

          <li className="mt-auto -mx-6 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center gap-x-3 px-6 py-3 text-base/6 font-semibold text-sidebar-foreground hover:bg-sidebar-hover focus:outline-none">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {(email ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate">{email ?? "Account"}</span>
                <ChevronsUpDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/account" search={{ tab: "profile" }} onClick={() => setMobileOpen(false)}>
                    <User className="size-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>
                      <ShieldCheck className="size-4" />
                      Superadmin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" />
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <p
              className="px-6 pb-3 text-[10px] leading-tight text-sidebar-foreground/40 tabular-nums"
              title="App-versie en buildtijd"
            >
              {APP_VERSION_LABEL}
            </p>
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
  const content = useShellHeaderContent();
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