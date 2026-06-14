import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Package, Palette, LogOut, Plug, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const nav = [
  { to: "/dashboard", label: "Shops", icon: Home },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebarBody = (
    <>
      <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">S</div>
        <span className="font-semibold tracking-tight">shoplabel</span>
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center px-4 md:px-6 gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plug className="h-4 w-4 text-primary" />
            <span>Shoplabel App Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto" style={{ fontFamily: 'Lato, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif', WebkitTextSizeAdjust: '100%', fontSize: '14px', lineHeight: '24px' }}>{children}</main>
      </div>
    </div>
  );
}