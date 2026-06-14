import { createFileRoute } from "@tanstack/react-router";
import { buildAgeVerificationScript } from "@/lib/widget-scripts.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
  "Content-Type": "application/javascript; charset=utf-8",
};

function emptyScript(reason: string) {
  return new Response(`/* shoplabel age-verification: ${reason} */`, {
    status: 200,
    headers: CORS,
  });
}

export const Route = createFileRoute("/api/public/age-verification.js")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shopId = url.searchParams.get("shop_id");
        if (!shopId || !/^[0-9a-f-]{36}$/i.test(shopId)) {
          return emptyScript("missing or invalid shop_id");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("shop_apps")
          .select("enabled, settings")
          .eq("shop_id", shopId)
          .eq("app_slug", "age-verification")
          .maybeSingle();

        if (error || !data || !data.enabled) {
          return emptyScript("app not installed or disabled");
        }

        const js = buildAgeVerificationScript((data.settings as Record<string, unknown>) ?? {});
        return new Response(js, { status: 200, headers: CORS });
      },
    },
  },
});