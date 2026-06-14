import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shops/$shopId/")({
  component: ShopConnectionPage,
});

const PERMISSIONS = ["Inhoud", "Producten", "Klanten", "Orders", "Instellingen", "Tracking"];

interface Shop {
  id: string;
  name: string;
  ecom_url: string | null;
  api_key: string | null;
  api_secret: string | null;
  status: string;
  updated_at: string;
}

function ShopConnectionPage() {
  const { shopId } = Route.useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const s = data as Shop;
          setShop(s);
          setName(s.name);
          setUrl(s.ecom_url ?? "");
          setActive(s.status === "connected");
        }
      });
  }, [shopId]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({
        name,
        ecom_url: url || null,
        status: active ? "connected" : "disconnected",
      })
      .eq("id", shopId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Opgeslagen");
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} gekopieerd`);
  }

  if (!shop) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  }

  return (
    <div className="px-6 py-6 space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Laatste activiteit: {new Date(shop.updated_at).toLocaleString("nl-NL")}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{active ? "Verbonden" : "Niet verbonden"}</Badge>
          <Button onClick={save} disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Instellingen</SectionLabel>
        <p className="text-sm text-muted-foreground px-1 mb-3 max-w-2xl">
          De permissies die je selecteert zullen volledige toegang geven tot de gekozen onderdelen van je
          eCom winkel. Wees behoedzaam wanneer je deze API key met derden deelt.
        </p>
        <SectionCard>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Label htmlFor="active" className="font-semibold">Activeer API key</Label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="p-5 space-y-4 border-b border-border">
            <div className="space-y-2">
              <Label htmlFor="name">Titel</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Shop URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="p-5">
            <h4 className="font-semibold mb-4">Permissies</h4>
            <div className="space-y-3">
              {PERMISSIONS.map((p) => (
                <div key={p} className="grid grid-cols-[1fr_auto_auto] items-center gap-8">
                  <span className="text-sm font-medium">{p}</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox /> Lezen
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox /> Schrijven
                  </label>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Details</SectionLabel>
        <SectionCard>
          <div className="grid grid-cols-3 gap-6 p-5 border-b border-border">
            {[
              { label: "Laatste 5 min", value: "0 van 300" },
              { label: "Laatste 1 uur", value: "0 van 3.000" },
              { label: "Laatste 1 dag", value: "0 van 12.000" },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="text-sm mt-1">{m.value}</div>
                <div className="h-1 bg-muted rounded mt-2 overflow-hidden">
                  <div className="h-full w-0 bg-primary" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input readOnly value={shop.api_key ?? "—"} className="font-mono text-sm bg-muted" />
                {shop.api_key && (
                  <Button type="button" variant="outline" size="icon" onClick={() => copy(shop.api_key!, "API key")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={showSecret ? "text" : "password"}
                  value={shop.api_secret ?? "—"}
                  className="font-mono text-sm bg-muted"
                />
                <Button type="button" variant="outline" onClick={() => setShowSecret((v) => !v)}>
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecret ? "Verberg" : "Toon"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div>
                <div className="text-muted-foreground">Aangemaakt op</div>
                <div>{new Date(shop.updated_at).toLocaleString("nl-NL")}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Laatste activiteit</div>
                <div>{new Date(shop.updated_at).toLocaleString("nl-NL")}</div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}