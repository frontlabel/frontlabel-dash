import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getRandomShopProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      count: z.number().int().min(1).max(10).optional(),
      language: z.string().min(2).max(5).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: shop, error } = await supabase
      .from("shops")
      .select("api_key, api_secret")
      .eq("id", data.shopId)
      .maybeSingle();
    if (error || !shop?.api_key || !shop?.api_secret) {
      return { products: [], reason: "no-credentials" as const };
    }
    const { fetchRandomShopProducts } = await import("./shop-products.server");
    try {
      const products = await fetchRandomShopProducts({
        apiKey: shop.api_key,
        apiSecret: shop.api_secret,
        ...(data.language ? { language: data.language } : {}),
        ...(data.count ? { count: data.count } : {}),
      });
      return { products, reason: products.length ? ("ok" as const) : ("empty" as const) };
    } catch {
      return { products: [], reason: "error" as const };
    }
  });
