import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { APPS_CATALOG } from "@/lib/apps-catalog";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents_monthly: number;
  price_cents_yearly: number;
  trial_days: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

interface AppPrice {
  app_slug: string;
  price_cents_monthly: number;
  price_cents_yearly: number;
  trial_days: number;
  currency: string;
  addon_available: boolean;
}

function AdminPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, navigate]);

  if (isAdmin === null) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Superadmin"
        subtitle="Beheer pakketten, app-prijzen en proefperiodes."
      />
      <div className="px-6 pb-12">
        <Tabs defaultValue="plans" className="w-full">
          <TabsList>
            <TabsTrigger value="plans">Pakketten</TabsTrigger>
            <TabsTrigger value="apps">App-prijzen</TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-4"><PlansTab /></TabsContent>
          <TabsContent value="apps" className="mt-4"><AppPricingTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planApps, setPlanApps] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: p }, { data: pa }] = await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("plan_apps").select("plan_id,app_slug"),
    ]);
    setPlans((p as Plan[]) ?? []);
    const map: Record<string, Set<string>> = {};
    ((pa as Array<{ plan_id: string; app_slug: string }>) ?? []).forEach((r) => {
      if (!map[r.plan_id]) map[r.plan_id] = new Set();
      map[r.plan_id].add(r.app_slug);
    });
    setPlanApps(map);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function addPlan() {
    const slug = `plan-${Date.now()}`;
    const { error } = await supabase.from("plans").insert({
      slug,
      name: "Nieuw pakket",
      price_cents_monthly: 0,
      price_cents_yearly: 0,
      trial_days: 14,
      sort_order: plans.length,
    });
    if (error) toast.error(error.message);
    else load();
  }

  async function saveplan(p: Plan) {
    const { error } = await supabase.from("plans").update({
      name: p.name,
      description: p.description,
      price_cents_monthly: p.price_cents_monthly,
      price_cents_yearly: p.price_cents_yearly,
      trial_days: p.trial_days,
      currency: p.currency,
      is_active: p.is_active,
      sort_order: p.sort_order,
    }).eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success("Pakket opgeslagen");
  }

  async function removePlan(id: string) {
    if (!confirm("Pakket verwijderen?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  async function toggleApp(planId: string, appSlug: string, checked: boolean) {
    if (checked) {
      const { error } = await supabase.from("plan_apps").insert({ plan_id: planId, app_slug: appSlug });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("plan_apps").delete().eq("plan_id", planId).eq("app_slug", appSlug);
      if (error) return toast.error(error.message);
    }
    load();
  }

  if (loading) return <SectionCard className="p-6 text-sm text-muted-foreground">Laden…</SectionCard>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={addPlan}><Plus className="h-4 w-4" /> Nieuw pakket</Button>
      </div>
      {plans.length === 0 && (
        <SectionCard className="p-8 text-center text-sm text-muted-foreground">
          Nog geen pakketten. Klik op “Nieuw pakket”.
        </SectionCard>
      )}
      {plans.map((p, idx) => (
        <SectionCard key={p.id} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Naam</Label>
              <Input value={p.name} onChange={(e) => update(idx, { name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Valuta</Label>
              <Input value={p.currency} onChange={(e) => update(idx, { currency: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Beschrijving</Label>
              <Textarea rows={2} value={p.description ?? ""} onChange={(e) => update(idx, { description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Prijs per maand (in cent)</Label>
              <Input type="number" min={0} value={p.price_cents_monthly} onChange={(e) => update(idx, { price_cents_monthly: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">= {(p.price_cents_monthly / 100).toFixed(2)} {p.currency}</p></div>
            <div className="space-y-1.5"><Label>Prijs per jaar (in cent)</Label>
              <Input type="number" min={0} value={p.price_cents_yearly} onChange={(e) => update(idx, { price_cents_yearly: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">= {(p.price_cents_yearly / 100).toFixed(2)} {p.currency}</p></div>
            <div className="space-y-1.5"><Label>Proefperiode (dagen)</Label>
              <Input type="number" min={0} value={p.trial_days} onChange={(e) => update(idx, { trial_days: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Sortering</Label>
              <Input type="number" value={p.sort_order} onChange={(e) => update(idx, { sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={p.is_active} onCheckedChange={(v) => update(idx, { is_active: v })} />
              <Label>Actief</Label>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <Label className="text-sm mb-2 block">Apps in dit pakket</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {APPS_CATALOG.map((app) => {
                const checked = planApps[p.id]?.has(app.slug) ?? false;
                return (
                  <label key={app.slug} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleApp(p.id, app.slug, !!v)} />
                    <span className="truncate">{app.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => removePlan(p.id)}>
              <Trash2 className="h-4 w-4" /> Verwijderen
            </Button>
            <Button size="sm" onClick={() => saveplan(p)}><Save className="h-4 w-4" /> Opslaan</Button>
          </div>
        </SectionCard>
      ))}
    </div>
  );

  function update(idx: number, patch: Partial<Plan>) {
    setPlans((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
}

function AppPricingTab() {
  const [rows, setRows] = useState<AppPrice[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("app_pricing").select("*");
    const existing = new Map<string, AppPrice>();
    ((data as AppPrice[]) ?? []).forEach((r) => existing.set(r.app_slug, r));
    const merged: AppPrice[] = APPS_CATALOG.map((a) => existing.get(a.slug) ?? {
      app_slug: a.slug,
      price_cents_monthly: 0,
      price_cents_yearly: 0,
      trial_days: 14,
      currency: "EUR",
      addon_available: true,
    });
    setRows(merged);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(r: AppPrice) {
    const { error } = await supabase.from("app_pricing").upsert(r);
    if (error) toast.error(error.message);
    else toast.success("Opgeslagen");
  }

  if (loading) return <SectionCard className="p-6 text-sm text-muted-foreground">Laden…</SectionCard>;

  return (
    <div className="space-y-3">
      {rows.map((r, idx) => {
        const app = APPS_CATALOG.find((a) => a.slug === r.app_slug);
        return (
          <SectionCard key={r.app_slug} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-end">
              <div>
                <div className="font-medium text-sm text-foreground">{app?.name ?? r.app_slug}</div>
                <div className="text-xs text-muted-foreground">{app?.category}</div>
              </div>
              <div className="space-y-1"><Label className="text-xs">€/mnd (cent)</Label>
                <Input className="w-28" type="number" value={r.price_cents_monthly} onChange={(e) => set(idx, { price_cents_monthly: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">€/jaar (cent)</Label>
                <Input className="w-28" type="number" value={r.price_cents_yearly} onChange={(e) => set(idx, { price_cents_yearly: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Proef (dagen)</Label>
                <Input className="w-24" type="number" value={r.trial_days} onChange={(e) => set(idx, { trial_days: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={r.addon_available} onCheckedChange={(v) => set(idx, { addon_available: v })} />
                <Label className="text-xs">Los verkrijgbaar</Label>
              </div>
              <Button size="sm" onClick={() => save(r)}><Save className="h-4 w-4" /></Button>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );

  function set(idx: number, patch: Partial<AppPrice>) {
    setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
}