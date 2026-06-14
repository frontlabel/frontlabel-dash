import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APPS_CATALOG } from "@/lib/apps-catalog";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shops/$shopId/apps")({
  component: AppsLayout,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "age-verification": ShieldCheck,
};

function AppsLayout() {
  const { shopId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isList = pathname === `/shops/${shopId}/apps`;
  if (!isList) return <Outlet />;
  return <AppsList shopId={shopId} />;
}

function AppsList({ shopId }: { shopId: string }) {
  const [installed, setInstalled] = useState<Record<string, { id: string; enabled: boolean }>>({});

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function refresh() {
    const { data } = await supabase
      .from("shop_apps")
      .select("id,app_slug,enabled")
      .eq("shop_id", shopId);
    const map: Record<string, { id: string; enabled: boolean }> = {};
    (data ?? []).forEach((r) => {
      const row = r as { id: string; app_slug: string; enabled: boolean };
      map[row.app_slug] = { id: row.id, enabled: row.enabled };
    });
    setInstalled(map);
  }

  async function install(slug: string) {
    const { error } = await supabase
      .from("shop_apps")
      .insert({ shop_id: shopId, app_slug: slug, enabled: true, settings: {} });
    if (error) toast.error(error.message);
    else {
      toast.success("App geïnstalleerd");
      refresh();
    }
  }

  async function toggle(slug: string, enabled: boolean) {
    const row = installed[slug];
    if (!row) return;
    const { error } = await supabase.from("shop_apps").update({ enabled }).eq("id", row.id);
    if (error) toast.error(error.message);
    else refresh();
  }

  return (
    <div className="px-6 py-6 pb-16">
      <SectionLabel>Apps voor deze shop</SectionLabel>
      <SectionCard>
        <ul className="divide-y divide-border">
          {APPS_CATALOG.map((app) => {
            const Icon = ICONS[app.slug] ?? ShieldCheck;
            const inst = installed[app.slug];
            return (
              <li key={app.slug} className="flex items-center gap-4 px-5 py-4">
                {app.image ? (
                  <img
                    src={app.image}
                    alt={app.name}
                    className="h-12 w-12 rounded-md object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {inst ? (
                      <Link to="/shops/$shopId/apps/$appSlug" params={{ shopId, appSlug: app.slug }} className="font-semibold">
                        {app.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{app.name}</span>
                    )}
                    <Badge variant="secondary" className="text-xs">{app.category}</Badge>
                    {app.status === "coming-soon" && (
                      <Badge variant="outline" className="text-xs">Binnenkort</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{app.tagline}</div>
                </div>
                {app.status === "coming-soon" ? (
                  <Button variant="outline" size="sm" disabled>Binnenkort</Button>
                ) : inst ? (
                  <div className="flex items-center gap-3">
                    <Switch checked={inst.enabled} onCheckedChange={(v) => toggle(app.slug, v)} />
                    <Button asChild size="sm" variant="outline">
                      <Link to="/shops/$shopId/apps/$appSlug" params={{ shopId, appSlug: app.slug }}>
                        Configureer <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => install(app.slug)}>
                    Installeer
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}