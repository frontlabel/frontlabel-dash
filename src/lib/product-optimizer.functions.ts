import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const toneSchema = z.object({
  tone: z.string().default("zakelijk"),
  language: z.string().default("Nederlands"),
  audience: z.string().default(""),
  brandName: z.string().default(""),
  descriptionLength: z.string().default("normaal"),
});

async function getShopCredentials(
  supabase: { from: (t: string) => any },
  shopId: string,
): Promise<{ apiKey: string; apiSecret: string; language: string } | null> {
  const { data } = await supabase
    .from("shops")
    .select("api_key, api_secret, api_language")
    .eq("id", shopId)
    .maybeSingle();
  if (!data?.api_key || !data?.api_secret) return null;
  return {
    apiKey: data.api_key as string,
    apiSecret: data.api_secret as string,
    language: (data.api_language as string) || "nl",
  };
}

/** Alle producten van de shop met volledigheidsscore. */
export const listOptimizableProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { products: [], reason: "no-credentials" as const };

    const { fetchProducts } = await import("./product-optimizer.server");
    try {
      const products = await fetchProducts(creds);
      return { products, reason: products.length ? ("ok" as const) : ("empty" as const) };
    } catch (e) {
      console.error("[product-optimizer] list failed", e);
      return { products: [], reason: "error" as const };
    }
  });

/** Eén product met afbeeldingen en het eerder bewaarde voorstel. */
export const getOptimizableProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid(), productId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { product: null, images: [], saved: null, reason: "no-credentials" as const };

    const { fetchProduct } = await import("./product-optimizer.server");
    const { product, images } = await fetchProduct({ ...creds, productId: data.productId });

    const { data: saved } = await context.supabase
      .from("product_optimizations")
      .select("suggestions, image_urls, score, updated_at")
      .eq("shop_id", data.shopId)
      .eq("product_ref", data.productId)
      .maybeSingle();

    let imageUrls: string[] = [];
    const paths = (saved?.image_urls as string[] | null) ?? [];
    if (paths.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const signed = await supabaseAdmin.storage.from("product-images").createSignedUrls(paths, 3600);
      imageUrls = (signed.data ?? []).map((s) => s.signedUrl).filter(Boolean);
    }

    return {
      product,
      images,
      saved: saved
        ? {
            suggestions: saved.suggestions,
            score: saved.score,
            updatedAt: saved.updated_at,
            imageUrls,
          }
        : null,
      reason: product ? ("ok" as const) : ("not-found" as const),
    };
  });

/** Laat AI verbeterde teksten, SEO, specificaties en alt-teksten voorstellen. */
export const generateProductSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      productId: z.string().min(1),
      settings: toneSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { fetchProduct, generateSuggestions } = await import("./product-optimizer.server");
    const { product, images } = await fetchProduct({ ...creds, productId: data.productId });
    if (!product) return { ok: false as const, error: "Product niet gevonden." };

    try {
      const suggestions = await generateSuggestions({ product, images, settings: data.settings });

      await context.supabase.from("product_optimizations").upsert(
        {
          shop_id: data.shopId,
          product_ref: data.productId,
          product_title: product.title,
          score: product.score,
          suggestions: suggestions as never,
          status: "suggested",
        },
        { onConflict: "shop_id,product_ref" },
      );

      return { ok: true as const, suggestions, product };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Er ging iets mis." };
    }
  });

/** Genereert een nieuwe productafbeelding en bewaart die bij het product. */
export const generateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      productId: z.string().min(1),
      style: z.enum(["studio", "sfeer", "lifestyle"]).default("studio"),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { fetchProduct, generateProductImageBytes } = await import("./product-optimizer.server");
    const { product } = await fetchProduct({ ...creds, productId: data.productId });
    if (!product) return { ok: false as const, error: "Product niet gevonden." };

    try {
      const bytes = await generateProductImageBytes({ product, style: data.style });
      const path = `${data.shopId}/${data.productId}/${Date.now()}.png`;

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const upload = await supabaseAdmin.storage
        .from("product-images")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (upload.error) throw new Error(upload.error.message);

      const { data: existing } = await context.supabase
        .from("product_optimizations")
        .select("image_urls")
        .eq("shop_id", data.shopId)
        .eq("product_ref", data.productId)
        .maybeSingle();

      const paths = [...(((existing?.image_urls as string[] | null) ?? []) as string[]), path];
      await context.supabase.from("product_optimizations").upsert(
        {
          shop_id: data.shopId,
          product_ref: data.productId,
          product_title: product.title,
          score: product.score,
          image_urls: paths,
        },
        { onConflict: "shop_id,product_ref" },
      );

      const signed = await supabaseAdmin.storage.from("product-images").createSignedUrl(path, 3600);
      return { ok: true as const, url: signed.data?.signedUrl ?? "" };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Er ging iets mis." };
    }
  });
