import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRandomShopProducts } from "@/lib/shop-products.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { StickySaveBar } from "@/components/sticky-save-bar";
import { DisplayModeField } from "@/components/display-mode-field";
import { useDisableAppGuard } from "@/components/disable-app-dialog";
import { useShellHeader } from "@/components/shell-header-context";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronRight,
  ImageIcon,
  LayoutGrid,
  Mail,
  Search,
  Save,
  TrendingUp,
  Upload,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/shops/$shopId/apps/back-in-stock",
)({
  component: BackInStockPage,
});

const APP_SLUG = "back-in-stock";

interface BackInStockSettings {
  buttonText: string;
  buttonColor: string;
  newsletterOptIn: boolean;
  emailSubject: string;
  brandColor: string;
  customMessage: string;
  scarcityUrgency: boolean;
  displayMode: "popup" | "drawer";
}

const DEFAULTS: BackInStockSettings = {
  buttonText: "Meld me wanneer beschikbaar",
  buttonColor: "#111827",
  newsletterOptIn: true,
  emailSubject: "Goed nieuws — {product} is weer op voorraad!",
  brandColor: "#111827",
  customMessage:
    "Hi {name}, het product waarop je wachtte is weer beschikbaar. Wees er snel bij voordat het opnieuw uitverkocht is!",
  scarcityUrgency: true,
  displayMode: "popup",
};

interface WaitlistRow {
  id: string;
  email: string;
  product_handle: string;
  product_title: string | null;
  created_at: string;
  status: "pending" | "notified" | "purchased" | "cancelled";
}

function BackInStockPage() {
  const { shopId } = Route.useParams();
  const { setContent } = useShellHeader();
  const [active, setActive] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackInStockSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [tab, setTab] = useState<"overview" | "widget" | "email" | "waitlist">("overview");

  const { requestToggle, dialog: disableDialog } = useDisableAppGuard({
    appName: "Back in Stock Alerts",
    appSlug: APP_SLUG,
    active,
    setActive,
  });

  // Echte producten uit de gekoppelde shop voor de voorbeelden
  const fetchProducts = useServerFn(getRandomShopProducts);
  const { data: productData } = useQuery({
    queryKey: ["shop-sample-products", shopId],
    queryFn: () => fetchProducts({ data: { shopId, count: 5 } }),
    staleTime: 5 * 60_000,
  });
  const sample = productData?.products?.[0];
  const sampleTitle = sample?.title ?? "Selvedge spijkerjas";
  const sampleCategory = sample?.category ?? "Jassen";
  const samplePrice =
    sample?.price != null
      ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: sample.currency || "EUR" }).format(sample.price)
      : "€189,00";
  const sampleImage = sample?.image ?? null;

  function update<K extends keyof BackInStockSettings>(k: K, v: BackInStockSettings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    if (rowId) {
      const { error } = await supabase
        .from("shop_apps")
        .update({ enabled: active, settings: settings as unknown as Json })
        .eq("id", rowId);
      if (error) toast.error(error.message);
      else toast.success("Opgeslagen");
    } else {
      const { data, error } = await supabase
        .from("shop_apps")
        .insert({ shop_id: shopId, app_slug: APP_SLUG, enabled: active, settings: settings as unknown as Json })
        .select("id")
        .single();
      if (error) toast.error(error.message);
      else {
        setRowId(data!.id);
        toast.success("Opgeslagen");
      }
    }
    setSaving(false);
  }

  useEffect(() => {
    setContent(
      <div className="flex items-center justify-between w-full gap-3">
        <nav className="flex items-center gap-2 text-sm min-w-0">
          <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
          <Link
            to="/shops/$shopId/apps"
            params={{ shopId }}
            className="text-foreground hover:underline truncate"
          >
            Apps
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate">Terug-op-voorraad meldingen</span>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="app-active" checked={active} onCheckedChange={requestToggle} />
            <Label htmlFor="app-active" className="cursor-pointer">
              {active ? "Actief" : "Uit"}
            </Label>
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="h-4 w-4" />
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>,
    );
    return () => setContent(null);
  }, [shopId, active, saving, settings, rowId, setContent, requestToggle]);

  // Laad bestaande instellingen + wachtlijst
  useEffect(() => {
    supabase
      .from("shop_apps")
      .select("id,enabled,settings")
      .eq("shop_id", shopId)
      .eq("app_slug", APP_SLUG)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRowId(data.id);
        setActive(data.enabled);
        setSettings({ ...DEFAULTS, ...((data.settings as Partial<BackInStockSettings>) ?? {}) });
      });
    supabase
      .from("back_in_stock_requests")
      .select("id,email,product_handle,product_title,created_at,status")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setWaitlist((data as WaitlistRow[]) ?? []));
  }, [shopId]);

  const { buttonText, buttonColor, newsletterOptIn, emailSubject, brandColor, customMessage, scarcityUrgency } = settings;

  // Wachtlijst state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; waitlist: number }>();
    for (const w of waitlist) {
      if (w.status !== "pending") continue;
      const key = w.product_handle;
      const name = w.product_title || w.product_handle;
      const cur = map.get(key) ?? { name, waitlist: 0 };
      cur.waitlist += 1;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.waitlist - a.waitlist)
      .slice(0, 5);
  }, [waitlist]);

  const filteredWaitlist = waitlist.filter((w) => {
    const product = w.product_title || w.product_handle;
    const matchesSearch =
      !search ||
      w.email.toLowerCase().includes(search.toLowerCase()) ||
      product.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tabs = [
    { id: "overview" as const, label: "Overzicht & analyses" },
    { id: "widget" as const, label: "Widget-ontwerp" },
    { id: "email" as const, label: "E-mail configuratie" },
    { id: "waitlist" as const, label: "Wachtlijst" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Terug-op-voorraad meldingen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zet uitverkochte producten om in teruggewonnen omzet.
        </p>
      </div>
      <div className="px-6 mt-4 border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6">
        {tab === "overview" && (
          <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Teruggewonnen omzet"
              value="€3,450"
              valueClassName="text-emerald-600"
              badge="+12% deze maand"
              badgeTone="success"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              label="E-mails verzonden"
              value="412"
              icon={<Mail className="h-4 w-4" />}
            />
            <MetricCard
              label="Conversieratio"
              value="18.5%"
              icon={<Bell className="h-4 w-4" />}
            />
          </div>

          <div>
            <SectionLabel>Meest aangevraagde producten</SectionLabel>
            <SectionCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px] pl-4">Foto</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead className="text-right">Wachtlijst</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                        Nog geen aanmeldingen ontvangen.
                      </TableCell>
                    </TableRow>
                  ) : topProducts.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="pl-4">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.waitlist}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
          </div>
        )}

        {tab === "widget" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Instellingen</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="btnText">Knoptekst</Label>
                  <Input
                    id="btnText"
                    value={buttonText}
                    onChange={(e) => update("buttonText", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Knopkleur</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={buttonColor}
                      onChange={(e) => update("buttonColor", e.target.value)}
                      className="h-9 w-12 rounded border border-input cursor-pointer bg-card"
                    />
                    <Input
                      value={buttonColor}
                      onChange={(e) => update("buttonColor", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="newsletter"
                    checked={newsletterOptIn}
                    onCheckedChange={(v) => update("newsletterOptIn", Boolean(v))}
                  />
                  <Label htmlFor="newsletter" className="cursor-pointer leading-tight">
                    Voeg een nieuwsbrief-opt-in toe om leads te verzamelen
                  </Label>
                </div>
                <DisplayModeField
                  value={settings.displayMode}
                  onChange={(v) => update("displayMode", v)}
                />
              </SectionCard>
            </div>

            <div>
              <SectionLabel>Live voorbeeld</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-md border border-border bg-background p-5">
                  <div className="grid grid-cols-[120px_1fr] gap-4">
                    <div className="h-32 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {sampleImage ? (
                        <img src={sampleImage} alt={sampleTitle} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        {sampleCategory}
                      </div>
                      <div className="font-semibold text-base leading-tight">
                        {sampleTitle}
                      </div>
                      <div className="text-sm font-medium">{samplePrice}</div>
                      <Badge variant="destructive" className="text-xs">Uitverkocht</Badge>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: buttonColor }}
                    >
                      {buttonText || "Meld me wanneer beschikbaar"}
                    </button>
                    {newsletterOptIn && (
                      <label className="flex items-start gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" defaultChecked className="mt-0.5" />
                        <span>Ja, stuur me ook af en toe updates en aanbiedingen.</span>
                      </label>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {tab === "email" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <SectionLabel>Instellingen</SectionLabel>
              <SectionCard className="p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">Onderwerp</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => update("emailSubject", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bedrijfslogo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/40">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm" type="button">
                      <Upload className="h-4 w-4" /> Upload logo
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Merkkleur</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => update("brandColor", e.target.value)}
                      className="h-9 w-12 rounded border border-input cursor-pointer bg-card"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => update("brandColor", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Persoonlijk bericht</Label>
                  <Textarea
                    id="msg"
                    rows={4}
                    value={customMessage}
                    onChange={(e) => update("customMessage", e.target.value)}
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="urgency" className="cursor-pointer">
                      Voeg urgentie toe
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Voegt regels toe zoals "Nog maar enkele beschikbaar!" om conversie te verhogen.
                    </p>
                  </div>
                  <Switch
                    id="urgency"
                    checked={scarcityUrgency}
                    onCheckedChange={(v) => update("scarcityUrgency", v)}
                  />
                </div>
              </SectionCard>
            </div>

            <div>
              <SectionLabel>Voorbeeld</SectionLabel>
              <SectionCard className="p-5">
                <div className="rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                  <div
                    className="h-2"
                    style={{ backgroundColor: brandColor }}
                  />
                  <div className="p-6 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Onderwerp: <span className="text-foreground">{emailSubject}</span>
                    </div>
                    <div className="rounded-md bg-muted h-44 flex items-center justify-center overflow-hidden">
                      {sampleImage ? (
                        <img src={sampleImage} alt={sampleTitle} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">{sampleTitle}</div>
                      <div className="text-sm font-medium">{samplePrice}</div>
                    </div>
                    {scarcityUrgency && (
                      <div className="text-xs font-medium text-amber-600">
                        ⚡ Nog maar enkele beschikbaar — wacht niet te lang!
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {customMessage}
                    </p>
                    <button
                      type="button"
                      className="w-full rounded-md py-2.5 text-sm font-semibold text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      Shop nu
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {tab === "waitlist" && (
          <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op e-mail of product…"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="pending">In afwachting</SelectItem>
                <SelectItem value="notified">Geïnformeerd</SelectItem>
                <SelectItem value="purchased">Gekocht</SelectItem>
                <SelectItem value="cancelled">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SectionCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">E-mailadres</TableHead>
                  <TableHead>Productnaam</TableHead>
                  <TableHead>Aanvraagdatum</TableHead>
                  <TableHead className="text-right pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Geen aanmeldingen gevonden.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWaitlist.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="pl-4 font-medium">{w.email}</TableCell>
                      <TableCell>{w.product_title || w.product_handle}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString("nl-NL")}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <StatusBadge status={w.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SectionCard>
          </div>
        )}
      </div>
      <StickySaveBar onSave={save} saving={saving} />
      {disableDialog}
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClassName,
  badge,
  badgeTone,
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  badge?: string;
  badgeTone?: "success";
  icon?: React.ReactNode;
}) {
  return (
    <SectionCard className="p-5">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-baseline gap-3 flex-wrap">
        <div className={`text-3xl font-bold tracking-tight ${valueClassName ?? ""}`}>
          {value}
        </div>
        {badge && (
          <span
            className={
              badgeTone === "success"
                ? "text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                : "text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            }
          >
            {badge}
          </span>
        )}
      </div>
    </SectionCard>
  );
}

function StatusBadge({ status }: { status: "pending" | "notified" | "purchased" | "cancelled" }) {
  const styles =
    status === "purchased"
      ? "bg-emerald-100 text-emerald-700"
      : status === "notified"
        ? "bg-blue-100 text-blue-700"
        : status === "cancelled"
          ? "bg-muted text-muted-foreground"
          : "bg-amber-100 text-amber-700";
  const label =
    status === "purchased"
      ? "Gekocht"
      : status === "notified"
        ? "Geïnformeerd"
        : status === "cancelled"
          ? "Geannuleerd"
          : "In afwachting";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles}`}>
      {label}
    </span>
  );
}