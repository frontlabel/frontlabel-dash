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
  Sparkles,
  Mail,
  UserPlus,
  ShieldCheck,
  BellRing,
  TrendingUp,
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

      <div className="px-6 pt-8 pb-8 grid gap-5 lg:grid-cols-3">
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
function RevenueCard() {
  return (
    <SectionCard className="p-6 flex flex-col">
      <div className="flex items-start justify-between">
        <h2 className="text-sm font-semibold text-foreground">Totale Gegenereerde Omzet</h2>
        <div className="rounded-full bg-emerald-100 p-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-emerald-600">€ 3.840,00</div>
        <div className="mt-2 flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">+24%</Badge>
          <span className="text-sm text-muted-foreground">extra omzet door frontlabel add-ons deze maand</span>
        </div>
      </div>
    </SectionCard>
  );
}

function HealthScoreCard() {
  const score = 78;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <SectionCard className="p-6 flex flex-col">
      <h2 className="text-sm font-semibold text-foreground">Shop Health Score</h2>
      <div className="mt-4 flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-muted"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="stroke-primary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tracking-tight text-foreground">{score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">3 van de 6 add-ons actief</p>
      </div>
      <Button className="mt-5 w-full">
        <Sparkles className="h-4 w-4" /> Optimaliseer shop (+22%)
      </Button>
    </SectionCard>
  );
}

const activity = [
  {
    icon: Mail,
    text: "Back-in-Stock e-mail verzonden naar klant voor 'Sneakers Size 42'",
    time: "2m geleden",
  },
  { icon: UserPlus, text: "Nieuwe inschrijving via Nieuwsbrief Pop-up", time: "5m geleden" },
  { icon: ShieldCheck, text: "18+ Verificatie succesvol afgerond", time: "12m geleden" },
  { icon: BellRing, text: "Price-Drop notificatie geactiveerd", time: "18m geleden" },
];

function ActivityFeedCard() {
  return (
    <SectionCard className="p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Live Activiteiten Feed</h2>
      <p className="text-xs text-muted-foreground mt-1">Realtime actie op je webshop</p>
      <ul className="mt-5 space-y-4">
        {activity.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.text} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-snug">{a.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
