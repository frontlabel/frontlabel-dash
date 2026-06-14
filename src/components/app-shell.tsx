import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Package, Palette, LogOut, Plug, Menu, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ShellHeaderProvider, useShellHeader } from "@/components/shell-header-context";

const nav = [
  { to: "/dashboard", label: "Shops", icon: Home },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);

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

  const activeShopId = pathname.match(/^\/shops\/([^/]+)/)?.[1] ?? null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebarBody = (
    <>
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <img
          src="http://frontlabel.nl/wp-content/uploads/2025/10/frontlabel-logo-white@3x.png"
          alt="Frontlabel"
          className="h-7 w-auto object-contain"
        />
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/") ||
            (item.to === "/dashboard" && pathname.startsWith("/shops"));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {shops.length > 0 && (
          <div className="pt-4">
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Shops
            </div>
            {shops.map((s) => {
              const active = activeShopId === s.id;
              return (
                <Link
                  key={s.id}
                  to="/shops/$shopId"
                  params={{ shopId: s.id }}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Store className="h-4 w-4" />
                  <span className="truncate">{s.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
      <button
        onClick={signOut}
        className="m-2 flex items-center gap-3 px-3 py-2.5 rounded text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Uitloggen
      </button>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="hidden md:flex w-60 shrink-0 bg-sidebar text-sidebar-foreground flex-col" style={{ fontFamily: 'Lato, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '16px' }}>
        {sidebarBody}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
          style={{ fontFamily: 'Lato, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '16px' }}
        >
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          {sidebarBody}
        </SheetContent>
      </Sheet>
      <ShellHeaderProvider>
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          <HeaderBar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <main className="flex-1" style={{ fontFamily: 'Lato, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', WebkitTextSizeAdjust: '100%', fontSize: '16px', lineHeight: '24px' }}>{children}</main>
        </div>
      </ShellHeaderProvider>
    </div>
  );
}

function HeaderBar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { content } = useShellHeader();
  return (
    <header className="sticky top-0 z-50 h-14 bg-card border-b border-border flex items-center">
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {content ? (
          <div className="flex-1 min-w-0">{content}</div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plug className="h-4 w-4 text-primary" />
            <span>Shoplabel App Admin</span>
          </div>
        )}
      </div>
    </header>
  );
}