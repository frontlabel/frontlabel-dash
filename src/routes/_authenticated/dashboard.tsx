import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Store,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Mail,
  UserPlus,
  ShieldCheck,
  BellRing,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Shoplabel app admin" },
      { name: "description", content: "Omzet, shop health score en live activiteit van je webshop add-ons." },
      { property: "og:title", content: "Dashboard — Shoplabel app admin" },
      { property: "og:description", content: "Omzet, shop health score en live activiteit van je webshop add-ons." },
    ],
  }),
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
  const [selectedShop, setSelectedShop] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id,name,ecom_url,status,updated_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as Shop[]) ?? [];
        setShops(rows);
        setSelectedShop((prev) => prev ?? rows[0]?.id);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="px-6 pt-8 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welkom terug, Webshop Eigenaar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dit is wat je add-ons vandaag voor je webshop doen.
          </p>
        </div>
        <Select value={selectedShop} onValueChange={setSelectedShop}>
          <SelectTrigger className="w-[220px] bg-card">
            <SelectValue placeholder="Selecteer shop" />
          </SelectTrigger>
          <SelectContent>
            {shops.length === 0 ? (
              <SelectItem value="none" disabled>
                Geen shops gekoppeld
              </SelectItem>
            ) : (
              shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="px-6 pb-8 grid gap-5 lg:grid-cols-3">
        <RevenueCard />
        <HealthScoreCard />
        <ActivityFeedCard />
      </div>

      <div className="px-6 pb-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Jouw shops</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/shops/new">
              <Plus className="h-4 w-4" /> Shop koppelen
            </Link>
          </Button>
        </div>
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