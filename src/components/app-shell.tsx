import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Package, Palette, LogOut, Plug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Shops", icon: Home },
  { to: "/apps", label: "Apps", icon: Package },
  { to: "/presets", label: "Stijl presets", icon: Palette },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">F</div>
          <span className="font-semibold tracking-tight">frontlabel</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/") ||
              (item.to === "/dashboard" && pathname.startsWith("/shops"));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
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
          className="m-2 flex items-center gap-3 px-3 py-2 rounded text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Uitloggen
        </button>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plug className="h-4 w-4 text-primary" />
            <span>Frontlabel App Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}