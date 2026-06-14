import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { toast } from "sonner";
import { Trash2, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/presets")({
  component: PresetsPage,
});

interface Preset {
  id: string;
  name: string;
  settings: { primaryColor?: string; backgroundColor?: string; textColor?: string; fontFamily?: string };
  created_at: string;
}

function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("style_presets")
      .select("id,name,settings,created_at")
      .order("created_at", { ascending: false });
    setPresets((data as Preset[]) ?? []);
    setLoading(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("style_presets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Preset verwijderd"); load(); }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Stijl presets" subtitle="Hergebruik visuele instellingen tussen apps en shops voor consistente branding." />
      <div className="px-6 pb-12">
        {loading ? (
          <SectionCard className="p-8 text-sm text-muted-foreground">Laden…</SectionCard>
        ) : presets.length === 0 ? (
          <SectionCard className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Palette className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nog geen presets</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sla een visuele stijl op vanuit een app-instellingen om hem hier te zien.
            </p>
          </SectionCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((p) => (
              <SectionCard key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="rounded-md p-4 text-center text-sm border"
                  style={{
                    background: p.settings.backgroundColor ?? "#fff",
                    color: p.settings.textColor ?? "#111",
                    fontFamily: p.settings.fontFamily ?? "Inter",
                  }}>
                  <div className="font-semibold mb-2">Voorbeeld</div>
                  <button className="px-3 py-1.5 rounded text-white text-xs"
                    style={{ background: p.settings.primaryColor ?? "#5187e0" }}>
                    Bevestigen
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {p.settings.primaryColor && <span className="font-mono">{p.settings.primaryColor}</span>}
                  {p.settings.fontFamily && <span>· {p.settings.fontFamily}</span>}
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}