import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Store, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Shop {
  id: string;
  name: string;
  ecom_url: string | null;
  status: string;
  updated_at: string;
}

function DashboardPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id,name,ecom_url,status,updated_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setShops((data as Shop[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Shops"
        subtitle="Beheer je gekoppelde Lightspeed shops en de apps die erop draaien."
        actions={
          <Button asChild>
            <Link to="/shops/new">
              <Plus className="h-4 w-4" /> Shop koppelen
            </Link>
          </Button>
        }
      />
      <div className="px-6 pb-12">
        {loading ? (
          <SectionCard className="p-8 text-sm text-muted-foreground">Laden…</SectionCard>
        ) : shops.length === 0 ? (
          <SectionCard className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Nog geen shops gekoppeld</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Koppel je eerste Lightspeed shop met je API key en secret.
            </p>
            <Button asChild>
              <Link to="/shops/new">
                <Plus className="h-4 w-4" /> Shop koppelen
              </Link>
            </Button>
          </SectionCard>
        ) : (
          <SectionCard>
            <ul className="divide-y divide-border">
              {shops.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/shops/$shopId"
                    params={{ shopId: s.id }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{s.name}</span>
                        {s.status === "connected" ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Verbonden
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0 gap-1">
                            <AlertCircle className="h-3 w-3" /> Niet verbonden
                          </Badge>
                        )}
                      </div>
                      {s.ecom_url && (
                        <div className="text-xs text-muted-foreground truncate">{s.ecom_url}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}