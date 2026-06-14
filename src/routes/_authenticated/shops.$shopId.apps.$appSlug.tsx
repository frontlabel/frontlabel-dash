import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DEFAULT_AGE_VERIFICATION,
  FONT_OPTIONS,
  getApp,
  type AgeVerificationSettings,
} from "@/lib/apps-catalog";
import type { Json } from "@/integrations/supabase/types";
import { AgeVerificationPreview } from "@/components/age-verification-preview";
import { Save, Palette, ChevronLeft, Copy, ExternalLink } from "lucide-react";

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

function AppSettingsPage() {
  const { shopId, appSlug } = Route.useParams();
  const app = useMemo(() => getApp(appSlug), [appSlug]);

  const [rowId, setRowId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [settings, setSettings] = useState<AgeVerificationSettings>(DEFAULT_AGE_VERIFICATION);
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");

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
      else toast.success("Opgeslagen");
    } else {
      const { data, error } = await supabase
        .from("shop_apps")
        .insert({ shop_id: shopId, app_slug: appSlug, enabled, settings: settings as unknown as Json })
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

  async function savePreset() {
    if (!presetName.trim()) {
      toast.error("Geef je preset een naam");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const visual = {
      primaryColor: settings.primaryColor,
      textColor: settings.textColor,
      backgroundColor: settings.backgroundColor,
      overlayColor: settings.overlayColor,
      fontFamily: settings.fontFamily,
      backgroundImageUrl: settings.backgroundImageUrl,
      borderRadius: settings.borderRadius,
    };
    const { data, error } = await supabase
      .from("style_presets")
      .insert({ owner_id: u.user.id, name: presetName, settings: visual as unknown as Json })
      .select("id,name,settings")
      .single();
    if (error) toast.error(error.message);
    else {
      toast.success("Preset opgeslagen");
      setPresets((p) => [data as PresetRow, ...p]);
      setPresetName("");
    }
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scriptUrl = `${origin}/api/public/age-verification.js?shop_id=${shopId}`;
  const snippet = `<script src="${scriptUrl}" defer></script>`;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} gekopieerd`);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  }

  return (
    <div className="px-6 py-6 pb-16">
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/shops/$shopId/apps"
          params={{ shopId }}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Terug naar apps
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="enabled" />
            <Label htmlFor="enabled" className="cursor-pointer">{enabled ? "Actief" : "Uit"}</Label>
          </div>
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold">{app.name}</h2>
        <p className="text-sm text-muted-foreground">{app.tagline}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-6 min-w-0">
          <div>
            <SectionLabel>Installeer op je shop</SectionLabel>
            <SectionCard className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">
                Plak dit script in de <code>&lt;head&gt;</code> of vlak voor <code>&lt;/body&gt;</code> van
                je Lightspeed-theme (of via Algemene instellingen → Scripts). De popup verschijnt automatisch
                zodra de app is ingeschakeld en opgeslagen.
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs break-all">
                {snippet}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(snippet, "Snippet")}>
                  <Copy className="h-4 w-4" /> Kopieer snippet
                </Button>
                <Button variant="outline" size="sm" onClick={() => copy(scriptUrl, "Script-URL")}>
                  <Copy className="h-4 w-4" /> Kopieer URL
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={scriptUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Test script
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: zet de app op <strong>Actief</strong> en sla op — anders levert het script bewust niets uit.
              </p>
            </SectionCard>
          </div>

          <div>
            <SectionLabel>Gedrag</SectionLabel>
            <SectionCard className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minAge">Minimum leeftijd</Label>
                  <Input id="minAge" type="number" min={1} max={99} value={settings.minAge}
                    onChange={(e) => update("minAge", Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rememberDays">Onthoud bezoeker (dagen)</Label>
                  <Input id="rememberDays" type="number" min={0} max={365} value={settings.rememberDays}
                    onChange={(e) => update("rememberDays", Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" value={settings.title} onChange={(e) => update("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea id="description" value={settings.description}
                  onChange={(e) => update("description", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Knop: bevestigen</Label>
                  <Input id="buttonText" value={settings.buttonText}
                    onChange={(e) => update("buttonText", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="declineText">Knop: te jong</Label>
                  <Input id="declineText" value={settings.declineText}
                    onChange={(e) => update("declineText", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="declineRedirect">Redirect bij te jong</Label>
                <Input id="declineRedirect" type="url" value={settings.declineRedirect}
                  onChange={(e) => update("declineRedirect", e.target.value)} />
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionLabel>Visuele stijl</SectionLabel>
            <SectionCard className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorField label="Knopkleur" value={settings.primaryColor} onChange={(v) => update("primaryColor", v)} />
                <ColorField label="Tekstkleur" value={settings.textColor} onChange={(v) => update("textColor", v)} />
                <ColorField label="Achtergrond modal" value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
                <ColorField label="Overlay kleur" value={settings.overlayColor} onChange={(v) => update("overlayColor", v)} />
              </div>
              <div className="space-y-2">
                <Label>Overlay transparantie: {Math.round(settings.overlayOpacity * 100)}%</Label>
                <Slider
                  value={[Math.round(settings.overlayOpacity * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => update("overlayOpacity", v / 100)}
                />
              </div>
              <div className="space-y-2">
                <Label>Lettertype</Label>
                <Select value={settings.fontFamily} onValueChange={(v) => update("fontFamily", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bgImg">Achtergrond afbeelding (URL)</Label>
                <Input id="bgImg" value={settings.backgroundImageUrl}
                  onChange={(e) => update("backgroundImageUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Hoeken afronding: {settings.borderRadius}px</Label>
                <Slider value={[settings.borderRadius]} min={0} max={32} step={1}
                  onValueChange={([v]) => update("borderRadius", v)} />
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionLabel>Te jonge bezoekers blokkeren</SectionLabel>
            <SectionCard className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="blockUnderage" className="cursor-pointer">Blokkeer toegang via cookie</Label>
                  <p className="text-xs text-muted-foreground">
                    Wanneer een bezoeker een te jonge geboortedatum invult, wordt dit in een cookie onthouden.
                    Zolang de cookie bestaat krijgt deze bezoeker de site niet meer te zien — tot de cookies worden gewist.
                  </p>
                </div>
                <Switch
                  id="blockUnderage"
                  checked={settings.blockUnderage}
                  onCheckedChange={(v) => update("blockUnderage", v)}
                />
              </div>
              {settings.blockUnderage && (
                <div className="space-y-2">
                  <Label htmlFor="blockDays">Blokkeer voor (dagen)</Label>
                  <Input
                    id="blockDays"
                    type="number"
                    min={1}
                    max={3650}
                    value={settings.blockDays}
                    onChange={(e) => update("blockDays", Number(e.target.value))}
                  />
                </div>
              )}
            </SectionCard>
          </div>

          <div>
            <SectionLabel>Stijl presets</SectionLabel>
            <SectionCard className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Sla deze visuele instellingen op als preset. Pas hem later toe op andere apps voor consistente
                branding tussen je shops.
              </p>
              <div className="flex gap-2">
                <Input placeholder="Bijv. Shoplabel huisstijl" value={presetName}
                  onChange={(e) => setPresetName(e.target.value)} />
                <Button variant="outline" onClick={savePreset}>
                  <Palette className="h-4 w-4" /> Bewaar
                </Button>
              </div>
              {presets.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Toepassen vanuit bestaand preset</Label>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button key={p.id} onClick={() => applyPreset(p.id)}
                        className="text-xs px-3 py-1.5 rounded border border-border bg-card hover:bg-accent transition-colors">
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 self-start">
          <SectionLabel>Live preview</SectionLabel>
          <SectionCard className="p-4">
            <AgeVerificationPreview s={settings} />
            <p className="text-xs text-muted-foreground text-center mt-3">
              Voorbeeld werkt live mee terwijl je instellingen wijzigt.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value.startsWith("#") ? value : "#2c7be5"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-input cursor-pointer bg-card" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );
}