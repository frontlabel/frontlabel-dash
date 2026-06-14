import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

const Body = z.object({
  shop_id: z.string().uuid(),
  product_handle: z.string().min(1).max(255),
  product_title: z.string().max(500).optional(),
  product_image_url: z.string().url().max(2048).optional(),
  variant_id: z.string().max(100).optional(),
  email: z.string().email().max(255),
  newsletter_opt_in: z.boolean().optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute("/api/public/back-in-stock/signup")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "invalid JSON" }, 400);
        }
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
          return json({ error: "invalid input", details: parsed.error.flatten() }, 400);
        }
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Controleer of app aan staat voor deze shop
        const { data: app } = await supabaseAdmin
          .from("shop_apps")
          .select("enabled")
          .eq("shop_id", input.shop_id)
          .eq("app_slug", "back-in-stock")
          .maybeSingle();
        if (!app || !app.enabled) {
          return json({ error: "app not enabled" }, 403);
        }

        const { error } = await supabaseAdmin
          .from("back_in_stock_requests")
          .insert({
            shop_id: input.shop_id,
            product_handle: input.product_handle,
            product_title: input.product_title ?? null,
            product_image_url: input.product_image_url ?? null,
            variant_id: input.variant_id ?? null,
            email: input.email,
            newsletter_opt_in: input.newsletter_opt_in ?? false,
          });

        // Unieke index voorkomt dubbele pending aanmeldingen — die behandelen we als succes.
        if (error && !/duplicate key|unique/i.test(error.message)) {
          return json({ error: "could not save" }, 500);
        }

        return json({ ok: true });
      },
    },
  },
});