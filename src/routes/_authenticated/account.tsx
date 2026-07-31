import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { User, Bell, CreditCard, Receipt, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  tab: z
    .enum(["profile", "notifications", "subscription", "billing"])
    .catch("profile"),
});

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AccountPage,
});

const TABS = [
  { id: "profile", label: "Profiel", icon: User, href: "/account" as const },
  { id: "notifications", label: "Notificaties", icon: Bell, href: "/account" as const },
  { id: "subscription", label: "Abonnement", icon: CreditCard, href: "/account" as const },
  { id: "billing", label: "Facturatie", icon: Receipt, href: "/pricing" as const },
] as const;

function AccountPage() {
  const { tab } = useSearch({ from: "/_authenticated/account" });
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Account instellingen"
        subtitle="Beheer je profiel, notificatievoorkeuren en abonnement."
      />
      <div className="px-6 pb-12">
        <nav className="flex gap-8 border-b border-gray-200 mb-6">
          {TABS.map((t) => {
            const active = t.href === "/pricing" ? false : tab === t.id;
            const isExternal = t.href === "/pricing";
            return (
              <Link
                key={t.id}
                to={t.href}
                search={isExternal ? undefined : { tab: t.id }}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div>
          {tab === "profile" && <ProfileSection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "subscription" && <SubscriptionSection />}
          {tab === "billing" && <BillingSection />}
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    company: "",
    role_title: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      setEmail(u.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,company,role_title,phone,avatar_url")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) {
        setProfile({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          company: data.company ?? "",
          role_title: data.role_title ?? "",
          phone: data.phone ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...profile });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profiel opgeslagen");
  }

  if (loading) return <SectionCard className="p-6 text-sm text-muted-foreground">Laden…</SectionCard>;

  const initials = ((profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "")).toUpperCase() || "?";

  return (
    <SectionCard className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Profiel</h2>
        <p className="text-sm text-muted-foreground">Pas hier je profielgegevens aan.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Voornaam *</Label>
          <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Achternaam</Label>
          <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Bedrijf</Label>
          <Input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Rol / titel</Label>
          <Input placeholder="(optioneel)" value={profile.role_title} onChange={(e) => setProfile({ ...profile, role_title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Telefoon</Label>
          <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={email} disabled />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Profielfoto</Label>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-semibold">
            {initials}
          </div>
          <Input placeholder="URL naar afbeelding (optioneel)" value={profile.avatar_url} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
      </div>
    </SectionCard>
  );
}

function NotificationsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState("nl");
  const [prefs, setPrefs] = useState({
    email_signup_notifications: true,
    email_alert_sent: true,
    email_weekly_digest: false,
    email_product_updates: true,
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: p }, { data: n }] = await Promise.all([
        supabase.from("profiles").select("notification_language").eq("id", u.user.id).maybeSingle(),
        supabase.from("notification_preferences").select("*").eq("user_id", u.user.id).maybeSingle(),
      ]);
      if (p?.notification_language) setLanguage(p.notification_language);
      if (n) setPrefs({
        email_signup_notifications: n.email_signup_notifications,
        email_alert_sent: n.email_alert_sent,
        email_weekly_digest: n.email_weekly_digest,
        email_product_updates: n.email_product_updates,
      });
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    const [r1, r2] = await Promise.all([
      supabase.from("profiles").update({ notification_language: language }).eq("id", userId),
      supabase.from("notification_preferences").upsert({ user_id: userId, ...prefs }),
    ]);
    setSaving(false);
    if (r1.error || r2.error) toast.error((r1.error ?? r2.error)!.message);
    else toast.success("Voorkeuren opgeslagen");
  }

  if (loading) return <SectionCard className="p-6 text-sm text-muted-foreground">Laden…</SectionCard>;

  const rows: Array<[keyof typeof prefs, string, string]> = [
    ["email_signup_notifications", "Nieuwe aanmelding", "E-mail wanneer een bezoeker zich aanmeldt voor een van je apps."],
    ["email_alert_sent", "Verzonden alerts", "E-mail wanneer een klantnotificatie is verstuurd (back-in-stock, price alert)."],
    ["email_weekly_digest", "Wekelijkse samenvatting", "Overzicht van activiteit per shop, elke maandag."],
    ["email_product_updates", "Product updates", "Occasionele mails over nieuwe apps en features."],
  ];

  return (
    <SectionCard className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notificaties</h2>
        <p className="text-sm text-muted-foreground">Pas hier je voorkeuren voor notificaties aan.</p>
      </div>
      <div className="space-y-1.5 max-w-xs">
        <Label>Notificatie taal *</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nl">Nederlands</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4 border-t border-border pt-6">
        {rows.map(([k, title, desc]) => (
          <div key={k} className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="font-medium text-sm text-foreground">{title}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <Switch checked={prefs[k]} onCheckedChange={(v) => setPrefs({ ...prefs, [k]: v })} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Opslaan…" : "Opslaan"}</Button>
      </div>
    </SectionCard>
  );
}

interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  price_cents_monthly: number;
  price_cents_yearly: number;
  trial_days: number;
  currency: string;
  is_active: boolean;
}

interface SubscriptionRow {
  id: string;
  shop_id: string;
  plan_id: string | null;
  status: string;
  billing_interval: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface ShopRow { id: string; name: string }

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(cents / 100);
}

function SubscriptionSection() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }, { data: sub }] = await Promise.all([
        supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("shops").select("id,name").order("name"),
        supabase.from("shop_subscriptions").select("*"),
      ]);
      setPlans((p as PlanRow[]) ?? []);
      setShops((s as ShopRow[]) ?? []);
      setSubs((sub as SubscriptionRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const subByShop = useMemo(() => {
    const m = new Map<string, SubscriptionRow>();
    subs.forEach((x) => m.set(x.shop_id, x));
    return m;
  }, [subs]);

  if (loading) return <SectionCard className="p-6 text-sm text-muted-foreground">Laden…</SectionCard>;

  return (
    <div className="space-y-6">
      <SectionCard className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Abonnement per shop</h2>
          <p className="text-sm text-muted-foreground">Elke shop heeft één actief pakket. Add-on apps kun je losbij nemen.</p>
        </div>
        {shops.length === 0 && (
          <p className="text-sm text-muted-foreground">Nog geen shops gekoppeld.</p>
        )}
        <ul className="divide-y divide-border">
          {shops.map((shop) => {
            const sub = subByShop.get(shop.id);
            const plan = sub ? plans.find((p) => p.id === sub.plan_id) : null;
            return (
              <li key={shop.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{shop.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {plan
                      ? `${plan.name} · ${money(sub!.billing_interval === "yearly" ? plan.price_cents_yearly : plan.price_cents_monthly, plan.currency)}/${sub!.billing_interval === "yearly" ? "jaar" : "mnd"}`
                      : "Geen actief pakket"}
                  </div>
                </div>
                {sub ? (
                  <StatusBadge status={sub.status} trialEnds={sub.trial_ends_at} />
                ) : (
                  <Badge variant="secondary">Geen abonnement</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Beschikbare pakketten</h2>
          <p className="text-sm text-muted-foreground">Kies straks een pakket per shop bij het activeren van betalingen.</p>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen pakketten geconfigureerd. Vraag een admin om pakketten aan te maken via Superadmin.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="border border-border rounded-md p-4 space-y-2">
                <div className="font-semibold text-foreground">{p.name}</div>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                <div className="text-2xl font-bold text-foreground">{money(p.price_cents_monthly, p.currency)}<span className="text-xs font-normal text-muted-foreground">/mnd</span></div>
                <div className="text-xs text-muted-foreground">of {money(p.price_cents_yearly, p.currency)}/jaar</div>
                {p.trial_days > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                    <Clock className="h-3 w-3" /> {p.trial_days} dagen proef
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function StatusBadge({ status, trialEnds }: { status: string; trialEnds: string | null }) {
  if (status === "trialing") {
    const days = trialEnds ? Math.max(0, Math.ceil((new Date(trialEnds).getTime() - Date.now()) / 86400000)) : null;
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 gap-1">
        <Clock className="h-3 w-3" /> Proef{days !== null ? ` · ${days} dagen` : ""}
      </Badge>
    );
  }
  if (status === "active") {
    return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0 gap-1"><CheckCircle2 className="h-3 w-3" /> Actief</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function BillingSection() {
  return (
    <SectionCard className="p-6 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Facturatie</h2>
      <p className="text-sm text-muted-foreground">
        Facturen en betaalgegevens worden zichtbaar zodra Stripe is geactiveerd. Zodra betalingen actief zijn, opent hier een klantportaal waar je facturen kunt downloaden en betaalmethodes kunt beheren.
      </p>
      <Button disabled variant="secondary">Klantportaal openen (binnenkort)</Button>
    </SectionCard>
  );
}