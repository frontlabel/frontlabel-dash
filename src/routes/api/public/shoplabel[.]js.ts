import { createFileRoute } from "@tanstack/react-router";
import {
  buildAgeVerificationScript,
  buildBackInStockScript,
  buildPriceAlertScript,
  buildTileCalculatorScript,
} from "@/lib/widget-scripts.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
  "Content-Type": "application/javascript; charset=utf-8",
};

function empty(reason: string) {
  return new Response(`/* shoplabel loader: ${reason} */`, { status: 200, headers: CORS });
}

export const Route = createFileRoute("/api/public/shoplabel.js")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shopId = url.searchParams.get("shop_id");
        if (!shopId || !/^[0-9a-f-]{36}$/i.test(shopId)) {
          return empty("missing or invalid shop_id");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("shop_apps")
          .select("app_slug, enabled, settings")
          .eq("shop_id", shopId)
          .eq("enabled", true);

        if (error) return empty("loader error");
        if (!data || data.length === 0) return empty("no apps enabled");

        const origin = `${url.protocol}//${url.host}`;
        const parts: string[] = [
          `/* shoplabel — ${data.length} app(s) actief */`,
        ];

        for (const row of data) {
          const settings = (row.settings as Record<string, unknown>) ?? {};
          if (row.app_slug === "age-verification") {
            parts.push(`/* age-verification */\n${buildAgeVerificationScript(settings)}`);
          } else if (row.app_slug === "back-in-stock") {
            parts.push(`/* back-in-stock */\n${buildBackInStockScript(settings, shopId, origin)}`);
          } else if (row.app_slug === "price-alert") {
            parts.push(`/* price-alert */\n${buildPriceAlertScript(settings, shopId, origin)}`);
          } else if (row.app_slug === "tile-calculator") {
            parts.push(`/* tile-calculator */\n${buildTileCalculatorScript(settings)}`);
          }
        }

        return new Response(parts.join("\n\n"), { status: 200, headers: CORS });
      },
    },
  },
});