import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { StickySaveBar } from "@/components/sticky-save-bar";
import { DisplayModeField } from "@/components/display-mode-field";
import { useDisableAppGuard } from "@/components/disable-app-dialog";
import { useShellHeader } from "@/components/shell-header-context";
import { cn } from "@/lib/utils";
import { Calculator, ChevronRight, LayoutGrid, Paintbrush, Ruler, Save, SquareStack, Package } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/shops/$shopId/apps/tile-calculator",
)({
  component: FloorCalculatorPage,
});

const APP_SLUG = "tile-calculator";

type CalcMode = "package" | "roll" | "paint";

interface FloorCalculatorSettings {
  buttonText: string;
  buttonColor: string;
  calcMode: CalcMode;
  productName: string;
  packageName: string;
  unitName: string;
  coveragePerPackage: number;
  unitWidthCm: number;
  unitHeightCm: number;
  rollWidthCm: number;
  rollLengthM: number;
  coverageM2PerLiter: number;
  packageSizeLiters: number;
  coats: number;
  marginPct: number;
  pricePerM2: number;
  currencySymbol: string;
  heading: string;
  intro: string;
  displayMode: "popup" | "drawer";
}

const DEFAULTS: FloorCalculatorSettings = {
  buttonText: "Bereken hoeveel je nodig hebt",
  buttonColor: "#111827",
  calcMode: "package",
  productName: "Tegels",
  packageName: "dozen",
  unitName: "stuks",
  coveragePerPackage: 1.44,
  unitWidthCm: 60,
  unitHeightCm: 60,
  rollWidthCm: 400,
  rollLengthM: 0,
  coverageM2PerLiter: 10,
  packageSizeLiters: 2.5,
  coats: 1,
  marginPct: 10,
  pricePerM2: 0,
  currencySymbol: "€",
  heading: "Hoeveel heb je nodig?",
  intro:
    "Vul de afmetingen van je ruimte in. We berekenen direct hoeveel je nodig hebt, inclusief marge voor snijverlies.",
  displayMode: "popup",
};

const MODE_LABELS: Record<CalcMode, { label: string; icon: React.ReactNode; description: string }> = {
  package: {
    label: "Per pak / doos",
    icon: <Package className="h-4 w-4" />,
    description: "Tegels, laminaat, parket — producten die per doos of pak worden verkocht.",
  },
  roll: {
    label: "Per rol / meter",
    icon: <Ruler className="h-4 w-4" />,
    description: "Tapijt, vinyl, behang — producten op rol of per strekkende meter.",
  },
  paint: {
    label: "Verf & lak",
    icon: <Paintbrush className="h-4 w-4" />,
    description: "Verf, lak, primer — producten waarvan je de dekking per liter nodig hebt.",
  },
};

function FloorCalculatorPage() {
  const { shopId } = Route.useParams();
  const { setContent } = useShellHeader();
  const [active, setActive] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<FloorCalculatorSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const { requestToggle, dialog: disableDialog } = useDisableAppGuard({
    appName: "Vloer & wand calculator",
    appSlug: APP_SLUG,
    active,
    setActive,
  });
  const [tab, setTab] = useState<"overview" | "widget" | "preview">("overview");

  function update<K extends keyof FloorCalculatorSettings>(k: K, v: FloorCalculatorSettings[K]) {
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
          <Link to="/shops/$shopId/apps" params={{ shopId }} className="text-foreground hover:underline truncate">
            Apps
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-foreground truncate">Vloer &amp; wand calculator</span>
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
        setSettings({ ...DEFAULTS, ...((data.settings as Partial<FloorCalculatorSettings>) ?? {}) });
      });
  }, [shopId]);

  const tabs = [
    { id: "overview" as const, label: "Overzicht" },
    { id: "widget" as const, label: "Instellingen" },
    { id: "preview" as const, label: "Live voorbeeld" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">Vloer &amp; wand calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Help bezoekers bepalen hoeveel ze nodig hebben — voor tegels, laminaat, tapijt, behang, verf of elk ander product.
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
        {tab === "overview" && <OverviewTab settings={settings} />}
        {tab === "widget" && <WidgetTab settings={settings} update={update} />}
        {tab === "preview" && <PreviewTab settings={settings} />}
      </div>
      <StickySaveBar onSave={save} saving={saving} />
      {disableDialog}
    </div>
  );
}

function OverviewTab({ settings }: { settings: FloorCalculatorSettings }) {
  const mode = MODE_LABELS[settings.calcMode];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={mode.icon} label="Berekeningsmodus" value={mode.label} />
        <InfoCard icon={<Ruler className="h-4 w-4" />} label="Product" value={settings.productName} />
        <InfoCard icon={<SquareStack className="h-4 w-4" />} label="Snijverlies" value={`${settings.marginPct}%`} />
      </div>

      <div>
        <SectionLabel>Hoe werkt het?</SectionLabel>
        <SectionCard className="p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            Op productpagina's verschijnt automatisch een knop <span className="font-medium text-foreground">"{settings.buttonText}"</span>.
            De bezoeker vult de afmetingen van zijn ruimte in en ziet direct de benodigde hoeveelheid.
          </p>
          <p>
            Kies de juiste berekeningsmodus voor je product: <span className="font-medium text-foreground">per pak/doos</span> voor tegels en laminaat,{" "}
            <span className="font-medium text-foreground">per rol/meter</span> voor tapijt en behang, of{" "}
            <span className="font-medium text-foreground">verf &amp; lak</span> voor verfproducten.
          </p>
          <p>
            Wil je de knop op een specifieke plek tonen? Plaats <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">data-shoplabel-tilecalc</code> op een element in je thema.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <SectionCard className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </SectionCard>
  );
}

function WidgetTab({
  settings,
  update,
}: {
  settings: FloorCalculatorSettings;
  update: <K extends keyof FloorCalculatorSettings>(k: K, v: FloorCalculatorSettings[K]) => void;
}) {
  const mode = settings.calcMode;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div>
          <SectionLabel>Knop &amp; tekst</SectionLabel>
          <SectionCard className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="btnText">Knoptekst</Label>
              <Input id="btnText" value={settings.buttonText} onChange={(e) => update("buttonText", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Knopkleur</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={settings.buttonColor}
                  onChange={(e) => update("buttonColor", e.target.value)}
                  className="h-9 w-12 rounded border border-input cursor-pointer bg-card"
                />
                <Input
                  value={settings.buttonColor}
                  onChange={(e) => update("buttonColor", e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heading">Titel popup</Label>
              <Input id="heading" value={settings.heading} onChange={(e) => update("heading", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intro">Inleidende tekst</Label>
              <Textarea id="intro" rows={3} value={settings.intro} onChange={(e) => update("intro", e.target.value)} />
            </div>
            <DisplayModeField
              value={settings.displayMode}
              onChange={(v) => update("displayMode", v)}
            />
          </SectionCard>
        </div>

        <div>
          <SectionLabel>Berekeningsmodus</SectionLabel>
          <SectionCard className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Kies de modus die past bij je product</Label>
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(MODE_LABELS) as CalcMode[]).map((m) => {
                  const info = MODE_LABELS[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => update("calcMode", m)}
                      className={cn(
                        "flex items-start gap-3 text-left p-3 rounded-lg border transition-colors",
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30",
                      )}
                    >
                      <div className={cn("mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")}>
                        {info.icon}
                      </div>
                      <div>
                        <div className={cn("text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                          {info.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <SectionLabel>Product &amp; labels</SectionLabel>
          <SectionCard className="p-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pn">Productnaam (bv. Tegels, Laminaat, Tapijt)</Label>
              <Input id="pn" value={settings.productName} onChange={(e) => update("productName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pname">Naam verpakking (bv. dozen, pakken, rollen, emmers)</Label>
              <Input id="pname" value={settings.packageName} onChange={(e) => update("packageName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uname">Naam eenheid (bv. stuks, planken, m¹)</Label>
              <Input id="uname" value={settings.unitName} onChange={(e) => update("unitName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mar">Standaard snijverlies (%)</Label>
              <Input
                id="mar"
                type="number"
                min={0}
                max={50}
                value={settings.marginPct}
                onChange={(e) => update("marginPct", Number(e.target.value) || 0)}
              />
            </div>
          </SectionCard>
        </div>

        {mode === "package" && (
          <div>
            <SectionLabel>Instellingen — per pak / doos</SectionLabel>
            <SectionCard className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cpp">Oppervlakte per verpakking (m²)</Label>
                <Input
                  id="cpp"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={settings.coveragePerPackage}
                  onChange={(e) => update("coveragePerPackage", Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Bijv. een doos met 4 tegels van 60×60 cm = 1,44 m²
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="uwc">Breedte per eenheid (cm)</Label>
                  <Input
                    id="uwc"
                    type="number"
                    min={1}
                    value={settings.unitWidthCm}
                    onChange={(e) => update("unitWidthCm", Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uhc">Hoogte per eenheid (cm)</Label>
                  <Input
                    id="uhc"
                    type="number"
                    min={1}
                    value={settings.unitHeightCm}
                    onChange={(e) => update("unitHeightCm", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Vul de afmetingen in om ook het aantal losse stuks te tonen. Laat op 0 om alleen het aantal verpakkingen te berekenen.
              </p>
            </SectionCard>
          </div>
        )}

        {mode === "roll" && (
          <div>
            <SectionLabel>Instellingen — per rol / meter</SectionLabel>
            <SectionCard className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="rwc">Rolbreedte (cm)</Label>
                <Input
                  id="rwc"
                  type="number"
                  min={1}
                  value={settings.rollWidthCm}
                  onChange={(e) => update("rollWidthCm", Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Bijv. tapijt is vaak 400 cm breed, behang vaak 53 cm.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rlm">Rollengte (m) — laat 0 voor per strekkende meter</Label>
                <Input
                  id="rlm"
                  type="number"
                  min={0}
                  step="0.1"
                  value={settings.rollLengthM}
                  onChange={(e) => update("rollLengthM", Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Vul een lengte in voor producten op rol (bv. behang = 10 m). Laat op 0 voor tapijt dat per strekkende meter wordt verkocht.
                </p>
              </div>
            </SectionCard>
          </div>
        )}

        {mode === "paint" && (
          <div>
            <SectionLabel>Instellingen — verf &amp; lak</SectionLabel>
            <SectionCard className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="cml">Dekking (m² per liter)</Label>
                <Input
                  id="cml"
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={settings.coverageM2PerLiter}
                  onChange={(e) => update("coverageM2PerLiter", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="psl">Inhoud per verpakking (liter)</Label>
                <Input
                  id="psl"
                  type="number"
                  min={0.1}
                  step="0.1"
                  value={settings.packageSizeLiters}
                  onChange={(e) => update("packageSizeLiters", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coats">Aantal lagen</Label>
                <Input
                  id="coats"
                  type="number"
                  min={1}
                  max={5}
                  value={settings.coats}
                  onChange={(e) => update("coats", Number(e.target.value) || 1)}
                />
              </div>
            </SectionCard>
          </div>
        )}

        <div>
          <SectionLabel>Prijs (optioneel)</SectionLabel>
          <SectionCard className="p-5 space-y-5">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="ppm">Prijs per m²</Label>
                <Input
                  id="ppm"
                  type="number"
                  min={0}
                  step="0.01"
                  value={settings.pricePerM2}
                  onChange={(e) => update("pricePerM2", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cs">Valuta</Label>
                <Input
                  id="cs"
                  value={settings.currencySymbol}
                  onChange={(e) => update("currencySymbol", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Laat de prijs op 0 om geen totaalprijs te tonen aan de bezoeker.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function PreviewTab({ settings }: { settings: FloorCalculatorSettings }) {
  const [length, setLength] = useState("4,5");
  const [width, setWidth] = useState("3,2");
  const [margin, setMargin] = useState(String(settings.marginPct));

  const result = useMemo(() => {
    const L = parseFloat(length.replace(",", "."));
    const W = parseFloat(width.replace(",", "."));
    const M = parseFloat(margin.replace(",", "."));
    if (!isFinite(L) || !isFinite(W) || L <= 0 || W <= 0) return null;
    const m = isFinite(M) && M >= 0 ? M : settings.marginPct;
    const area = L * W;
    const withMargin = area * (1 + m / 100);

    const res: Record<string, number | string> = { area, withMargin, m };

    if (settings.calcMode === "package") {
      const coverage = settings.coveragePerPackage || 1;
      res.packages = coverage > 0 ? Math.ceil(withMargin / coverage) : 0;
      if (settings.unitWidthCm > 0 && settings.unitHeightCm > 0) {
        const unitArea = (settings.unitWidthCm / 100) * (settings.unitHeightCm / 100);
        res.pieces = unitArea > 0 ? Math.ceil(withMargin / unitArea) : 0;
      }
    } else if (settings.calcMode === "roll") {
      const rollW = (settings.rollWidthCm || 400) / 100;
      const rollL = settings.rollLengthM || 0;
      if (rollL > 0) {
        const rollArea = rollW * rollL;
        res.rolls = rollArea > 0 ? Math.ceil(withMargin / rollArea) : 0;
      } else {
        res.rolls = Math.ceil(withMargin / rollW);
      }
      res.rollWidth = rollW;
    } else if (settings.calcMode === "paint") {
      const coverage = settings.coverageM2PerLiter || 10;
      const coats = settings.coats || 1;
      const liters = coverage > 0 ? Math.ceil((withMargin * coats) / coverage) : 0;
      const pkgSize = settings.packageSizeLiters || 1;
      res.liters = liters;
      res.packages = pkgSize > 0 ? Math.ceil(liters / pkgSize) : 0;
    }

    if (settings.pricePerM2 > 0) {
      res.price = withMargin * settings.pricePerM2;
    }

    return res;
  }, [length, width, margin, settings]);

  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  const fmtInt = (n: number) => String(Math.ceil(n));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
      <div>
        <SectionLabel>Knop op productpagina</SectionLabel>
        <SectionCard className="p-5">
          <div className="rounded-md border border-border bg-background p-5 space-y-3">
            <div className="font-semibold text-base">Sample {settings.productName}</div>
            <div className="text-sm text-muted-foreground">{settings.currencySymbol}34,95 per m²</div>
            <button
              type="button"
              className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: settings.buttonColor }}
            >
              <Calculator className="inline h-4 w-4 mr-1" />
              {settings.buttonText}
            </button>
          </div>
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Berekening (zoals bezoeker ziet)</SectionLabel>
        <SectionCard className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Lengte (m)</Label>
              <Input value={length} onChange={(e) => setLength(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Breedte (m)</Label>
              <Input value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Snijverlies (%)</Label>
              <Input value={margin} onChange={(e) => setMargin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Productinfo</Label>
              <Input
                value={
                  settings.calcMode === "package"
                    ? `${settings.coveragePerPackage} m² per ${settings.packageName}`
                    : settings.calcMode === "roll"
                      ? `${settings.rollWidthCm} cm breed`
                      : `${settings.coverageM2PerLiter} m²/L`
                }
                disabled
              />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            {!result ? (
              <div className="text-muted-foreground">Vul lengte en breedte in om een berekening te zien.</div>
            ) : (
              <div className="space-y-1.5">
                <Row label="Oppervlakte" value={`${fmt(result.area as number)} m²`} />
                <Row label={`Incl. ${result.m}% snijverlies`} value={`${fmt(result.withMargin as number)} m²`} />

                {settings.calcMode === "package" && (
                  <>
                    {result.pieces !== undefined && (
                      <Row
                        label={`Aantal ${settings.unitName}`}
                        value={fmtInt(result.pieces as number)}
                      />
                    )}
                    <Row
                      label={`Aantal ${settings.packageName}`}
                      value={fmtInt(result.packages as number)}
                    />
                  </>
                )}

                {settings.calcMode === "roll" && (
                  <>
                    <Row
                      label={settings.rollLengthM > 0 ? `Aantal ${settings.packageName}` : `Aantal ${settings.packageName} nodig`}
                      value={fmtInt(result.rolls as number)}
                    />
                    {settings.rollLengthM > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Rolbreedte: {fmt(result.rollWidth as number)} m
                      </div>
                    )}
                  </>
                )}

                {settings.calcMode === "paint" && (
                  <>
                    <Row label="Benodigde liters" value={fmtInt(result.liters as number)} />
                    <Row
                      label={`Aantal ${settings.packageName}`}
                      value={fmtInt(result.packages as number)}
                    />
                  </>
                )}

                {settings.pricePerM2 > 0 && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row
                      label="Totaalprijs"
                      value={`${settings.currencySymbol}${fmt(result.price as number)}`}
                      strong
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(strong ? "font-semibold text-base" : "font-medium")}>{value}</span>
    </div>
  );
}
