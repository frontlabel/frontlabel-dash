import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Package, Palette, LogOut, Plug, Menu, ChevronDown, Store, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ShellHeaderProvider, useShellHeader } from "@/components/shell-header-context";

interface Shop {
  id: string;
  name: string;
  ecom_url: string | null;
}

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsOpen, setShopsOpen] = useState(false);

  const shopIdMatch = pathname.match(/^\/shops\/([^/]+)/);
  const currentShopId = shopIdMatch?.[1] ?? null;
  const currentShop = shops.find((s) => s.id === currentShopId);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id,name,ecom_url")
      .order("created_at", { ascending: false })
      .then(({ data }) => setShops((data as Shop[]) ?? []));
  }, []);

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

      {shops.length > 0 && (
        <div className="px-3 pt-3">
          <Collapsible open={shopsOpen} onOpenChange={setShopsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left transition-colors",
                  shopsOpen
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {currentShop ? currentShop.name : "Selecteer shop"}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    shopsOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {shops.map((shop) => {
                const active = shop.id === currentShopId;
                return (
                  <Link
                    key={shop.id}
                    to="/shops/$shopId"
                    params={{ shopId: shop.id }}
                    onClick={() => {
                      setShopsOpen(false);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span className="truncate flex-1">{shop.name}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </Link>
                );
              })}
              <Link
                to="/shops/new"
                onClick={() => {
                  setShopsOpen(false);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <span className="truncate">+ Nieuwe shop koppelen</span>
              </Link>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

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
