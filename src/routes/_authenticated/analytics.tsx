import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Shoplabel app admin" },
      { name: "description", content: "Bekijk prestaties en omzetimpact van je Shoplabel add-ons." },
      { property: "og:title", content: "Analytics — Shoplabel app admin" },
      { property: "og:description", content: "Bekijk prestaties en omzetimpact van je Shoplabel add-ons." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Analytics" subtitle="Prestaties en omzetimpact van je add-ons." />
      <div className="px-6 pb-12">
        <SectionCard className="p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Analytics komt binnenkort</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Hier zie je straks conversie, omzet en gebruik per app.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
