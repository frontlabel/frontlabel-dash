import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { getApp } from "@/lib/apps-catalog";
import { Store, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/apps/$appSlug")({
  component: AppShopPickerPage,
});

interface ShopRow {
  id: string;
  name: string;
  ecom_url: string | null;
}

function AppShopPickerPage() {
  const { appSlug } = Route.useParams();
  const app = getApp(appSlug);
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopRow[] | null>(null);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id,name,ecom_url")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const rows = (data as ShopRow[]) ?? [];
        if (rows.length === 1) {
          navigate({
            to: "/shops/$shopId/apps/$appSlug",
            params: { shopId: rows[0].id, appSlug },
            replace: true,
          });
          return;
        }
        setShops(rows);
      });
  }, [appSlug, navigate]);

  if (!app) {
    return <div className="p-6">App niet gevonden.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={app.name} subtitle={app.tagline ?? app.description} />
      <div className="px-6 pb-12">
        <SectionLabel>Kies een shop</SectionLabel>
        {shops === null ? (
          <SectionCard className="p-5 text-sm text-muted-foreground">Shops laden…</SectionCard>
        ) : shops.length === 0 ? (
          <SectionCard className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Je hebt nog geen shop gekoppeld. Koppel eerst een shop om deze app te installeren.
            </p>
            <Link to="/shops/new" className="text-sm font-medium text-primary hover:underline">
              Shop koppelen →
            </Link>
          </SectionCard>
        ) : (
          <div className="space-y-2">
            {shops.map((s) => (
              <Link
                key={s.id}
                to="/shops/$shopId/apps/$appSlug"
                params={{ shopId: s.id, appSlug }}
                className="block"
              >
                <SectionCard className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      {s.ecom_url && (
                        <div className="text-xs text-muted-foreground truncate">{s.ecom_url}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </SectionCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}