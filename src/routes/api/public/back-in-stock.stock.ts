import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=30",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// Lightspeed eCom C-Series: zie https://developers.lightspeedhq.com/ecom/introduction/
// Endpoint: GET https://api.shoplightspeed.com/{lang}/products/{id}.json
// Auth: HTTP Basic met api_key:api_secret
async function fetchLightspeedStock(opts: {
  apiKey: string;
  apiSecret: string;
  language: string;
  productId: string;
}): Promise<{ inStock: boolean; title?: string; image?: string } | null> {
  const auth = "Basic " + Buffer.from(`${opts.apiKey}:${opts.apiSecret}`).toString("base64");
  const url = `https://api.shoplightspeed.com/${encodeURIComponent(opts.language)}/products/${encodeURIComponent(opts.productId)}.json`;
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { product?: Record<string, unknown> };
  const p = data.product;
  if (!p) return null;

  // Lightspeed velden: stockLevel (number), stockTracking ("disabled" | "enabled" | "indicator"),
  // isVisible, variants (array). Bij meerdere varianten kijken we naar totale voorraad.
  const tracking = String(p.stockTracking ?? "disabled");
  // Als voorraad niet getrackt wordt, beschouwen we als "op voorraad".
  if (tracking === "disabled") {
    return { inStock: true, title: String(p.fulltitle ?? p.title ?? ""), image: extractImage(p) };
  }
  const stockLevel = Number(p.stockLevel ?? 0);
  return {
    inStock: stockLevel > 0,
    title: String(p.fulltitle ?? p.title ?? ""),
    image: extractImage(p),
  };
}

function extractImage(p: Record<string, unknown>): string | undefined {
  const image = p.image as Record<string, unknown> | undefined;
  if (image && typeof image.src === "string") return image.src;
  return undefined;
}

export const Route = createFileRoute("/api/public/back-in-stock/stock")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shopId = url.searchParams.get("shop_id") ?? "";
        const productId = url.searchParams.get("product_id") ?? "";
        const language = (url.searchParams.get("lang") ?? "nl").toLowerCase().slice(0, 5);

        if (!/^[0-9a-f-]{36}$/i.test(shopId)) return json({ error: "invalid shop_id" }, 400);
        if (!/^[0-9]{1,12}$/.test(productId)) return json({ error: "invalid product_id" }, 400);
        if (!/^[a-z]{2}(-[a-z]{2})?$/.test(language)) return json({ error: "invalid lang" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // App moet aanstaan
        const { data: app } = await supabaseAdmin
          .from("shop_apps")
          .select("enabled")
          .eq("shop_id", shopId)
          .eq("app_slug", "back-in-stock")
          .maybeSingle();
        if (!app || !app.enabled) return json({ error: "app not enabled" }, 403);

        const { data: shop } = await supabaseAdmin
          .from("shops")
          .select("api_key, api_secret")
          .eq("id", shopId)
          .maybeSingle();
        if (!shop?.api_key || !shop?.api_secret) {
          return json({ error: "shop credentials missing" }, 412);
        }

        try {
          const result = await fetchLightspeedStock({
            apiKey: shop.api_key,
            apiSecret: shop.api_secret,
            language,
            productId,
          });
          if (!result) return json({ inStock: null, error: "lookup failed" }, 200);
          return json(result);
        } catch {
          return json({ inStock: null, error: "lookup error" }, 200);
        }
      },
    },
  },
});