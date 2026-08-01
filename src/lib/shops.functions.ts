import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { shopId: string }) => {
    if (!data?.shopId || typeof data.shopId !== "string") throw new Error("shopId ontbreekt");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: shop, error } = await supabase
      .from("shops")
      .select("id, owner_id")
      .eq("id", data.shopId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!shop || shop.owner_id !== userId) throw new Error("Shop niet gevonden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const children = [
      "back_in_stock_requests",
      "price_alert_requests",
      "shop_apps",
      "shop_addons",
      "shop_subscriptions",
    ] as const;
    for (const table of children) {
      const { error: delErr } = await supabaseAdmin.from(table).delete().eq("shop_id", data.shopId);
      if (delErr) throw new Error(`${table}: ${delErr.message}`);
    }
    const { error: shopErr } = await supabaseAdmin.from("shops").delete().eq("id", data.shopId);
    if (shopErr) throw new Error(shopErr.message);
    return { ok: true };
  });
