import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionLabel } from "@/components/section-card";
import { APPS_CATALOG } from "@/lib/apps-catalog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Settings2, Download, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsLayout,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "age-verification": ShieldCheck,
};

function AppsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/apps") return <Outlet />;
  return <AppsCatalogPage />;
}

function AppsCatalogPage() {
  const [installed, setInstalled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from("shop_apps")
      .select("app_slug,enabled")
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        (data ?? []).forEach((r) => {
          const row = r as { app_slug: string; enabled: boolean };
          map[row.app_slug] = map[row.app_slug] || row.enabled;
        });
        setInstalled(map);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Apps" subtitle="Shoplabel apps die je per shop kunt installeren en configureren." />
      <div className="px-6 pb-12">
        <SectionLabel>Beschikbaar</SectionLabel>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...APPS_CATALOG]
            .sort((a, b) =>
              (a.status === "coming-soon" ? 1 : 0) - (b.status === "coming-soon" ? 1 : 0),
            )
            .map((app) => {
            const Icon = ICONS[app.slug] ?? ShieldCheck;
            const soon = app.status === "coming-soon";
            const isInstalled = !!installed[app.slug];
            return (
              <li
                key={app.slug}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white shadow-sm"
              >
                <div className="flex flex-1 flex-col p-4 text-left">
                  {app.image ? (
                    <img
                      src={app.image}
                      alt={app.name}
                      className="aspect-video w-full rounded-md object-cover object-bottom"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{app.name}</h3>
                    {!isInstalled && soon && (
                      <Badge variant="outline" className="shrink-0 text-xs">Binnenkort</Badge>
                    )}
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{app.description}</p>
                </div>
                <div>
                  <div className="-mt-px flex divide-x divide-gray-200">
                    {soon ? (
                      <div className="flex w-0 flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-400">
                        <Download className="h-4 w-4" />
                        Binnenkort
                      </div>
                    ) : (
                      <>
                        <div className="flex w-0 flex-1">
                          <Link
                            to="/apps/$appSlug"
                            params={{ appSlug: app.slug }}
                            className={`relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-bl-lg border border-transparent py-3 text-sm font-semibold hover:bg-gray-50 ${isInstalled ? "text-green-600" : "text-gray-900"}`}
                          >
                            {isInstalled ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Geïnstalleerd
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 text-gray-400" />
                                Installeer
                              </>
                            )}
                          </Link>
                        </div>
                        <div className="-ml-px flex w-0 flex-1">
                          <Link
                            to="/apps/$appSlug"
                            params={{ appSlug: app.slug }}
                            className="relative inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-br-lg border border-transparent py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                          >
                            <Settings2 className="h-4 w-4 text-gray-400" />
                            Configureer
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}