import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { APPS_CATALOG } from "@/lib/apps-catalog";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsCatalogPage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "age-verification": ShieldCheck,
};

function AppsCatalogPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Apps" subtitle="Shoplabel apps die je per shop kunt installeren en configureren." />
      <div className="px-6 pb-12">
        <SectionLabel>Beschikbaar</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {APPS_CATALOG.map((app) => {
            const Icon = ICONS[app.slug] ?? ShieldCheck;
            return (
              <SectionCard key={app.slug} className="p-5">
                <div className="flex items-start gap-4">
                  {app.image ? (
                    <img
                      src={app.image}
                      alt={app.name}
                      className="h-16 w-16 rounded-md object-cover shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{app.name}</h3>
                      {app.status === "coming-soon" && (
                        <Badge variant="outline" className="text-xs">Binnenkort</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{app.description}</p>
                    <Link to="/dashboard" className="text-sm text-primary hover:underline">
                      Kies een shop om te installeren →
                    </Link>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}