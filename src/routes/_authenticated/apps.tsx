import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionLabel } from "@/components/section-card";
import { APPS_CATALOG } from "@/lib/apps-catalog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Settings2, Download } from "lucide-react";

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
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Apps" subtitle="Shoplabel apps die je per shop kunt installeren en configureren." />
      <div className="px-6 pb-12">
        <SectionLabel>Beschikbaar</SectionLabel>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {APPS_CATALOG.map((app) => {
            const Icon = ICONS[app.slug] ?? ShieldCheck;
            const soon = app.status === "coming-soon";
            return (
              <li
                key={app.slug}
                className="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm"
              >
                <div className="flex flex-1 flex-col p-6 text-left">
                  <div className="flex items-start gap-4">
                    {app.image ? (
                      <img
                        src={app.image}
                        alt={app.name}
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-gray-900">{app.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">{app.category}</Badge>
                        {soon && <Badge variant="outline" className="text-xs">Binnenkort</Badge>}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-sm text-muted-foreground">{app.description}</p>
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
                            className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-2 rounded-bl-lg border border-transparent py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                          >
                            <Download className="h-4 w-4 text-gray-400" />
                            Installeer
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