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
import { useShellHeader } from "@/components/shell-header-context";
import { cn } from "@/lib/utils";
import { Calculator, ChevronRight, LayoutGrid, Package, Ruler, Save, SquareStack } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/shops/$shopId/apps/tile-calculator",
)({
  component: TileCalculatorPage,
});

const APP_SLUG = "tile-calculator";

interface TileCalculatorSettings {
  buttonText: string;
  buttonColor: string;
  tileWidthCm: number;
  tileHeightCm: number;
  piecesPerBox: number;
  marginPct: number;
  pricePerM2: number;
  currencySymbol: string;
  heading: string;
  intro: string;
}

const DEFAULTS: TileCalculatorSettings = {
  buttonText: "Bereken hoeveel je nodig hebt",
  buttonColor: "#111827",
  tileWidthCm: 60,
  tileHeightCm: 60,
  piecesPerBox: 4,
  marginPct: 10,
  pricePerM2: 0,
  currencySymbol: "€",
  heading: "Tegel calculator",
  intro:
    "Vul de afmetingen van je ruimte in. We berekenen direct hoeveel m² en dozen je nodig hebt, inclusief marge voor snijverlies.",
};

function TileCalculatorPage() {
  const { shopId } = Route.useParams();
  const { setContent } = useShellHeader();
  const [active, setActive] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<TileCalculatorSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "widget" | "preview">("overview");

  function update<K extends keyof TileCalculatorSettings>(k: K, v: TileCalculatorSettings[K]) {
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
          <span className="text-foreground truncate">Tegel calculator</span>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="app-active" checked={active} onCheckedChange={setActive} />
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
  }, [shopId, active, saving, settings, rowId, setContent]);

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
        setSettings({ ...DEFAULTS, ...((data.settings as Partial<TileCalculatorSettings>) ?? {}) });
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
        <h1 className="text-2xl font-bold tracking-tight">Tegel calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Help bezoekers in één klik bepalen hoeveel tegels en dozen ze nodig hebben — inclusief instelbare marge voor snijverlies.
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
    </div>
  );
}

function OverviewTab({ settings }: { settings: TileCalculatorSettings }) {
  const tileArea = (settings.tileWidthCm / 100) * (settings.tileHeightCm / 100);
  const m2PerBox = tileArea * settings.piecesPerBox;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard icon={<Ruler className="h-4 w-4" />} label="Tegelformaat" value={`${settings.tileWidthCm} × ${settings.tileHeightCm} cm`} />
        <InfoCard icon={<Package className="h-4 w-4" />} label="Per doos" value={`${settings.piecesPerBox} stuks ≈ ${m2PerBox.toFixed(2).replace(".", ",")} m²`} />
        <InfoCard icon={<SquareStack className="h-4 w-4" />} label="Snijverlies" value={`${settings.marginPct}%`} />
      </div>

      <div>
        <SectionLabel>Hoe werkt het?</SectionLabel>
        <SectionCard className="p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            Op productpagina's verschijnt automatisch een knop <span className="font-medium text-foreground">"{settings.buttonText}"</span>.
            De bezoeker vult de afmetingen van zijn ruimte in en ziet direct het aantal m², tegels en dozen dat nodig is.
          </p>
          <p>
            Stel je tegelafmetingen, aantal tegels per doos en standaard snijverlies in onder <span className="font-medium text-foreground">Instellingen</span>. Voeg desgewenst een prijs per m² toe om ook een totaalprijs te tonen.
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
  settings: TileCalculatorSettings;
  update: <K extends keyof TileCalculatorSettings>(k: K, v: TileCalculatorSettings[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <SectionLabel>Knop & tekst</SectionLabel>
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
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Tegel & berekening</SectionLabel>
        <SectionCard className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tw">Tegelbreedte (cm)</Label>
              <Input
                id="tw"
                type="number"
                min={1}
                value={settings.tileWidthCm}
                onChange={(e) => update("tileWidthCm", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="th">Tegelhoogte (cm)</Label>
              <Input
                id="th"
                type="number"
                min={1}
                value={settings.tileHeightCm}
                onChange={(e) => update("tileHeightCm", Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ppb">Tegels per doos</Label>
              <Input
                id="ppb"
                type="number"
                min={1}
                value={settings.piecesPerBox}
                onChange={(e) => update("piecesPerBox", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mar">Snijverlies (%)</Label>
              <Input
                id="mar"
                type="number"
                min={0}
                max={50}
                value={settings.marginPct}
                onChange={(e) => update("marginPct", Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-2">
              <Label htmlFor="ppm">Prijs per m² (optioneel)</Label>
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
  );
}

function PreviewTab({ settings }: { settings: TileCalculatorSettings }) {
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
    const tileArea = (settings.tileWidthCm / 100) * (settings.tileHeightCm / 100);
    const tiles = tileArea > 0 ? Math.ceil(withMargin / tileArea) : 0;
    const boxes = settings.piecesPerBox > 0 ? Math.ceil(tiles / settings.piecesPerBox) : 0;
    const price = settings.pricePerM2 > 0 ? boxes * settings.piecesPerBox * tileArea * settings.pricePerM2 : 0;
    return { area, withMargin, tiles, boxes, price, m };
  }, [length, width, margin, settings]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
      <div>
        <SectionLabel>Knop op productpagina</SectionLabel>
        <SectionCard className="p-5">
          <div className="rounded-md border border-border bg-background p-5 space-y-3">
            <div className="font-semibold text-base">Sample tegel 60 × 60</div>
            <div className="text-sm text-muted-foreground">€34,95 per m²</div>
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
              <Label className="text-xs">Tegelformaat</Label>
              <Input value={`${settings.tileWidthCm} × ${settings.tileHeightCm} cm`} disabled />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            {!result ? (
              <div className="text-muted-foreground">Vul lengte en breedte in om een berekening te zien.</div>
            ) : (
              <div className="space-y-1.5">
                <Row label="Oppervlakte" value={`${result.area.toFixed(2).replace(".", ",")} m²`} />
                <Row label={`Incl. ${result.m}% snijverlies`} value={`${result.withMargin.toFixed(2).replace(".", ",")} m²`} />
                <Row label="Aantal tegels" value={String(result.tiles)} />
                <Row label={`Aantal dozen (${settings.piecesPerBox} per doos)`} value={String(result.boxes)} />
                {settings.pricePerM2 > 0 && (
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row
                      label="Totaalprijs"
                      value={`${settings.currencySymbol}${result.price.toFixed(2).replace(".", ",")}`}
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