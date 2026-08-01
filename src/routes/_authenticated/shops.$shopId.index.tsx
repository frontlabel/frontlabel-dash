import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteShop } from "@/lib/shops.functions";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, EyeOff, Trash2, Unplug } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/shops/$shopId/")({
  component: ShopConnectionPage,
});



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
  const navigate = useNavigate();
  const removeShop = useServerFn(deleteShop);
  const [shop, setShop] = useState<Shop | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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

  async function disconnect() {
    setDisconnecting(true);
    const { error } = await supabase
      .from("shops")
      .update({ status: "disconnected", access_token: null })
      .eq("id", shopId);
    setDisconnecting(false);
    if (error) return toast.error(error.message);
    setActive(false);
    toast.success("Shop ontkoppeld. De koppeling met Lightspeed is verbroken.");
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeShop({ data: { shopId } });
      toast.success("Shop verwijderd");
      setConfirmDelete(false);
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verwijderen mislukt");
    } finally {
      setDeleting(false);
    }
  }

  if (!shop) {
    return <div className="p-6 text-sm text-muted-foreground">Laden…</div>;
  }

  // Gebruik de stabiele publieke URL (preview-URL's vereisen Lovable-login en
  // blokkeren externe requests met een 302 naar /auth).
  const origin =
    typeof window !== "undefined" && /id-preview--|lovableproject\.com/.test(window.location.host)
      ? "https://project--818f6290-65fe-4f2a-9fa0-7d95790d5f04-dev.lovable.app"
      : (typeof window !== "undefined" ? window.location.origin : "");
  const scriptUrl = `${origin}/api/public/shoplabel.js?shop_id=${shopId}`;
  const snippet = `<script src="${scriptUrl}" defer></script>`;

  return (
    <div className="px-6 py-6 space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Laatste activiteit: {new Date(shop.updated_at).toLocaleString("nl-NL")}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{active ? "Verbonden" : "Niet verbonden"}</Badge>
          <Button onClick={save} disabled={saving} className="py-3 h-auto">
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
        </div>
      </div>

      <div>
        <SectionLabel>Shoplabel script</SectionLabel>
        <SectionCard className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Plak dit script <strong>één keer</strong> in de <code>&lt;head&gt;</code> of vlak voor
            <code> &lt;/body&gt;</code> van je Lightspeed-theme. Alle apps die je in deze shop activeert
            (18+ verificatie, terug-op-voorraad meldingen, etc.) lopen automatisch via dit ene script —
            je hoeft niets meer te installeren wanneer je een nieuwe app aanzet.
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
            Tip: zet apps op <strong>Actief</strong> en sla op — anders levert het script voor die app bewust niets uit.
          </p>
        </SectionCard>
      </div>

      <div>
        <SectionLabel>Instellingen</SectionLabel>
        <SectionCard>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Label htmlFor="active" className="font-semibold">Activeer API key</Label>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Titel</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Shop URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
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