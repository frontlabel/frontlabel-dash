import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { SectionCard, SectionLabel } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/shops/new")({
  component: NewShopPage,
});

function NewShopPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("shops")
      .insert({
        owner_id: userData.user.id,
        name,
        ecom_url: url || null,
        api_key: apiKey || null,
        api_secret: apiSecret || null,
        status: apiKey && apiSecret ? "connected" : "disconnected",
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Shop gekoppeld");
    navigate({ to: "/shops/$shopId", params: { shopId: data!.id } });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="px-6 pt-8">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Shops
        </Link>
      </div>
      <PageHeader
        title="Shop koppelen"
        subtitle="Vul je Lightspeed API credentials in om deze shop aan je admin te koppelen."
      />
      <form onSubmit={handleSubmit} className="px-6 pb-12 space-y-6">
        <div>
          <SectionLabel>Shop</SectionLabel>
          <SectionCard className="p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shopnaam</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Bijv. eCom (C-Series)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Shop URL</Label>
              <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://jouw-shop.webshopapp.com" />
            </div>
          </SectionCard>
        </div>
        <div>
          <SectionLabel>Lightspeed API credentials</SectionLabel>
          <SectionCard className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Maak deze aan via je Lightspeed back-office → Instellingen → Developers → nieuwe API key.
              De permissies daar bepalen waar onze apps bij mogen.
            </p>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="c095f24ccadc908a5323e70fe6f8c605" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input id="apiSecret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="••••••••••••••••" autoComplete="off" />
            </div>
          </SectionCard>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={loading || !name}>
            {loading ? "Bezig…" : "Shop koppelen"}
          </Button>
        </div>
      </form>
    </div>
  );
}