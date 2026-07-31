import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useDisableAppGuard } from "@/components/disable-app-dialog";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AGE_VERIFICATION,
  FONT_OPTIONS,
  getApp,
  type AgeVerificationSettings,
} from "@/lib/apps-catalog";
import type { Json } from "@/integrations/supabase/types";
import { AgeVerificationPreview } from "@/components/age-verification-preview";
import { SectionCard } from "@/components/section-card";
import { Save, ChevronRight, LayoutGrid, X, Zap } from "lucide-react";
import { useShellHeader } from "@/components/shell-header-context";

export const Route = createFileRoute("/_authenticated/shops/$shopId/apps/$appSlug")({
  component: AppSettingsPage,
});

interface ShopAppRow {
  id: string;
  enabled: boolean;
  settings: Partial<AgeVerificationSettings> | null;
}

interface PresetRow {
  id: string;
  name: string;
  settings: Partial<AgeVerificationSettings>;
}

const TABS = [
  { id: "algemeen", label: "Algemeen" },
  { id: "inhoud", label: "Inhoud & Tekst" },
  { id: "design", label: "Design & Stijl" },
  { id: "regels", label: "Regels & Logica" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputCls =
  "rounded-lg border-gray-300 bg-white shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500";

function FormRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SectionCard className="p-6">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </SectionCard>
  );
}

function AppSettingsPage() {
  const { shopId, appSlug } = Route.useParams();
  const app = useMemo(() => getApp(appSlug), [appSlug]);
  const { setContent } = useShellHeader();

  const [tab, setTab] = useState<TabId>("algemeen");
  const [rowId, setRowId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState<AgeVerificationSettings>(DEFAULT_AGE_VERIFICATION);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { requestToggle, dialog: disableDialog } = useDisableAppGuard({
    appName: app?.name ?? "deze app",
    appSlug,
    active: enabled,
    setActive: setEnabled,
  });

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
          <span className="text-foreground truncate">{app?.name}</span>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={requestToggle} id="enabled-header" />
            <Label htmlFor="enabled-header" className="cursor-pointer">
              {enabled ? "Actief" : "Uit"}
            </Label>
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="h-4 w-4" />
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>
    );
    return () => setContent(null);
  }, [shopId, app?.name, enabled, saving, settings, rowId, setContent, requestToggle]);

  useEffect(() => {
    supabase
      .from("shop_apps")
      .select("id,enabled,settings")
      .eq("shop_id", shopId)
      .eq("app_slug", appSlug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const r = data as ShopAppRow;
          setRowId(r.id);
          setEnabled(r.enabled);
          setSettings({ ...DEFAULT_AGE_VERIFICATION, ...(r.settings ?? {}) });
        }
      });
    supabase
      .from("style_presets")
      .select("id,name,settings")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPresets((data as PresetRow[]) ?? []));
  }, [shopId, appSlug]);

  function update<K extends keyof AgeVerificationSettings>(key: K, value: AgeVerificationSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    if (rowId) {
      const { error } = await supabase
        .from("shop_apps")
        .update({ enabled, settings: settings as unknown as Json })
        .eq("id", rowId);
      if (error) toast.error(error.message);
      else setSavedAt(Date.now());
    } else {
      const { data, error } = await supabase
        .from("shop_apps")
        .insert({ shop_id: shopId, app_slug: appSlug, enabled, settings: settings as unknown as Json })
        .select("id")
        .single();
      if (error) toast.error(error.message);
      else {
        setRowId(data!.id);
        setSavedAt(Date.now());
      }
    }
    setSaving(false);
  }

  function applyPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setSettings((s) => ({ ...s, ...p.settings }));
    toast.success(`Stijl "${p.name}" toegepast`);
  }

  if (!app) {
    return <div className="p-6">App niet gevonden.</div>;
  }

  return (
    <div className="pb-20">
      {savedAt && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-[hsl(120_60%_95%)] border-b border-[hsl(120_40%_80%)] text-[hsl(140_50%_30%)] text-sm">
          <span>Wijzigingen succesvol opgeslagen!</span>
          <button
            onClick={() => setSavedAt(null)}
            className="text-[hsl(140_50%_30%)] hover:opacity-70"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="px-8 pt-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{app.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{app.tagline}</p>

        <nav className="mt-6 flex gap-8 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="px-8 pt-8 grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        <div className="lg:col-span-3 min-w-0 space-y-6">
          {tab === "algemeen" && (
            <>
              <FormRow title="Basis instellingen" description="Beheer de basisfuncties van de pop-up.">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minAge">Minimum leeftijd</Label>
                    <Input id="minAge" type="number" min={1} max={99} className={inputCls}
                      value={settings.minAge} onChange={(e) => update("minAge", Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rememberDays">Onthoud bezoeker (dagen)</Label>
                    <Input id="rememberDays" type="number" min={0} max={365} className={inputCls}
                      value={settings.rememberDays} onChange={(e) => update("rememberDays", Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <Label htmlFor="enabledMain" className="cursor-pointer">App actief</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Zet de leeftijdscheck aan of uit voor deze shop.
                    </p>
                  </div>
                  <Switch id="enabledMain" checked={enabled} onCheckedChange={requestToggle} />
                </div>
              </FormRow>

              <FormRow title="Omleiding" description="Waar sturen we bezoekers heen die te jong zijn?">
                <div className="space-y-2">
                  <Label htmlFor="declineRedirect">Redirect URL bij 'te jong'</Label>
                  <Input id="declineRedirect" type="url" className={inputCls}
                    value={settings.declineRedirect} onChange={(e) => update("declineRedirect", e.target.value)} />
                </div>
              </FormRow>
            </>
          )}

          {tab === "inhoud" && (
            <FormRow title="Tekstuele inhoud" description="Bepaal wat je bezoeker leest in de pop-up.">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" className={inputCls} value={settings.title}
                  onChange={(e) => update("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea id="description" rows={3} className={inputCls} value={settings.description}
                  onChange={(e) => update("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Bevestig knop tekst</Label>
                  <Input id="buttonText" className={inputCls} value={settings.buttonText}
                    onChange={(e) => update("buttonText", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="declineText">Te jong knop tekst</Label>
                  <Input id="declineText" className={inputCls} value={settings.declineText}
                    onChange={(e) => update("declineText", e.target.value)} />
                </div>
              </div>
            </FormRow>
          )}

          {tab === "design" && (
            <FormRow title="Huisstijl" description="Kleuren, typografie en vormgeving van de pop-up.">
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                      <Zap className="h-3.5 w-3.5" />
                      Neem kleuren over uit "{p.name}"
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-6">
                <ColorField label="Knopkleur" value={settings.primaryColor} onChange={(v) => update("primaryColor", v)} />
                <ColorField label="Tekstkleur" value={settings.textColor} onChange={(v) => update("textColor", v)} />
                <ColorField label="Achtergrond modal" value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                <ColorField label="Overlay kleur" value={settings.overlayColor} onChange={(v) => update("overlayColor", v)} />
              </div>
              <div className="space-y-2">
                <Label>Overlay transparantie: {Math.round(settings.overlayOpacity * 100)}%</Label>
                <Slider value={[Math.round(settings.overlayOpacity * 100)]} min={0} max={100} step={1}
                  onValueChange={([v]) => update("overlayOpacity", v / 100)} />
              </div>
              <div className="space-y-2">
                <Label>Lettertype</Label>
                <Select value={settings.fontFamily} onValueChange={(v) => update("fontFamily", v)}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bgImg">Achtergrond afbeelding (URL)</Label>
                <Input id="bgImg" className={inputCls} placeholder="https://..." value={settings.backgroundImageUrl}
                  onChange={(e) => update("backgroundImageUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hoeken afronding: {settings.borderRadius}px</Label>
                <Slider value={[settings.borderRadius]} min={0} max={32} step={1}
                  onValueChange={([v]) => update("borderRadius", v)} />
              </div>
            </FormRow>
          )}

          {tab === "regels" && (
            <FormRow title="Cookie instellingen" description="Bepaal hoe lang we een keuze van de bezoeker onthouden.">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Label htmlFor="blockUnderage" className="cursor-pointer">Onthoud bezoeker</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Een te jonge geboortedatum wordt in een cookie onthouden. Zolang die cookie bestaat krijgt
                    de bezoeker de shop niet meer te zien.
                  </p>
                </div>
                <Switch id="blockUnderage" checked={settings.blockUnderage}
                  onCheckedChange={(v) => update("blockUnderage", v)} />
              </div>
              {settings.blockUnderage && (
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="blockDays">Blokkeer voor (dagen)</Label>
                  <Input id="blockDays" type="number" min={1} max={3650} className={inputCls}
                    value={settings.blockDays} onChange={(e) => update("blockDays", Number(e.target.value))} />
                </div>
              )}
            </FormRow>
          )}

        </div>

        <div className="lg:col-span-2 lg:sticky lg:top-8 self-start">
          <div className="rounded-2xl bg-gray-900/5 p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live preview
            </p>
            <div className="mx-auto max-w-[340px]">
              <AgeVerificationPreview s={settings} />
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Voorbeeld werkt live mee terwijl je instellingen wijzigt.
            </p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-8 border-t border-gray-200 bg-white/90 backdrop-blur px-8 py-3">
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="rounded-lg">
            <Save className="h-4 w-4" />
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>
      {disableDialog}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value.startsWith("#") ? value : "#5187e0"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-lg border border-gray-300 cursor-pointer bg-white" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "font-mono text-sm")} />
      </div>
    </div>
  );
}
