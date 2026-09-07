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
      imageUrls = (signed.data ?? [])
        .map((s) => s.signedUrl)
        .filter((u): u is string => typeof u === "string" && u.length > 0);
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
            imagePaths: paths,
          }
        : null,
      reason: product ? ("ok" as const) : ("not-found" as const),
    };
  });

/** Slaat de volgorde van de productafbeeldingen op in de shop. */
export const reorderShopImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      imageIds: z.array(z.string().min(1)).min(1).max(100),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { reorderProductImages } = await import("./product-optimizer.server");
    return reorderProductImages({ ...creds, imageIds: data.imageIds });
  });

/** Verwijdert een gegenereerde afbeelding uit de opslag en bij het product. */
export const deleteGeneratedImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ shopId: z.string().uuid(), productId: z.string().min(1), path: z.string().min(1) }),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("product_optimizations")
      .select("image_urls")
      .eq("shop_id", data.shopId)
      .eq("product_ref", data.productId)
      .maybeSingle();
    if (!existing) return { ok: false as const, error: "Afbeelding niet gevonden." };

    const paths = (((existing.image_urls as string[] | null) ?? []) as string[]).filter(
      (p) => p !== data.path,
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("product-images").remove([data.path]);

    await context.supabase
      .from("product_optimizations")
      .update({ image_urls: paths })
      .eq("shop_id", data.shopId)
      .eq("product_ref", data.productId);

    return { ok: true as const };
  });

/** Zet één gegenereerde afbeelding bij de productafbeeldingen in de shop. */
export const pushGeneratedImageToShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      productId: z.string().min(1),
      path: z.string().min(1),
      title: z.string().default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { data: existing } = await context.supabase
      .from("product_optimizations")
      .select("image_urls")
      .eq("shop_id", data.shopId)
      .eq("product_ref", data.productId)
      .maybeSingle();
    const paths = ((existing?.image_urls as string[] | null) ?? []) as string[];
    if (!paths.includes(data.path)) return { ok: false as const, error: "Afbeelding niet gevonden." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const dl = await supabaseAdmin.storage.from("product-images").download(data.path);
    if (dl.error || !dl.data) return { ok: false as const, error: "Afbeelding kon niet gelezen worden." };

    const buf = Buffer.from(await dl.data.arrayBuffer());
    const { uploadProductImages } = await import("./product-optimizer.server");
    const up = await uploadProductImages({
      ...creds,
      productId: data.productId,
      images: [
        {
          filename: data.path.split("/").pop() || `${Date.now()}.png`,
          base64: buf.toString("base64"),
          ...(data.title ? { title: data.title } : {}),
        },
      ],
    });

    if (!up.uploaded) return { ok: false as const, error: up.error ?? "Toevoegen mislukt." };
    return { ok: true as const };
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

    const { fetchProduct, generateSuggestions, fetchSpecLibrary, fetchProductSpecs } = await import(
      "./product-optimizer.server"
    );
    const { product, images } = await fetchProduct({ ...creds, productId: data.productId });
    if (!product) return { ok: false as const, error: "Product niet gevonden." };

    // Bestaande specificaties als vaste woordenlijst meegeven, zodat de AI geen
    // dubbele of verkeerd gespelde specificatienamen verzint.
    let knownSpecLabels: string[] = [];
    let currentSpecs: { label: string; value: string }[] = [];
    try {
      const [library, own] = await Promise.all([
        fetchSpecLibrary(creds),
        fetchProductSpecs({ ...creds, productId: data.productId }),
      ]);
      knownSpecLabels = library.attributes.map((a) => a.title).filter(Boolean);
      currentSpecs = own.specs
        .filter((sp) => sp.label)
        .map((sp) => ({ label: sp.label, value: sp.value }));
    } catch (e) {
      console.error("[product-optimizer] spec library failed", e);
    }

    try {
      const suggestions = await generateSuggestions({
        product,
        images,
        settings: data.settings,
        knownSpecLabels,
        currentSpecs,
      });

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

/** Schrijft het goedgekeurde voorstel terug naar het product in Lightspeed. */
export const syncProductToShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      productId: z.string().min(1),
      fields: z.object({
        title: z.string().default(""),
        seoTitle: z.string().default(""),
        metaDescription: z.string().default(""),
        description: z.string().default(""),
      }),
      altTexts: z.array(z.string()).default([]),
      // Gewenste eindvolgorde van productafbeeldingen; "staged:<path>" = nog te uploaden gegenereerde afbeelding.
      imageOrder: z.array(z.string().min(1)).max(150).default([]),
      specs: z
        .array(
          z.object({
            attributeId: z.string().nullable().default(null),
            label: z.string().min(1),
            value: z.string().default(""),
          }),
        )
        .default([]),
      allowNewSpecs: z.boolean().default(false),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { pushProductToShop, uploadProductImages, pushProductSpecs } = await import(
      "./product-optimizer.server"
    );
    const result = await pushProductToShop({
      ...creds,
      productId: data.productId,
      fields: data.fields,
      altTexts: data.altTexts,
    });
    if (!result.ok) return { ok: false as const, error: result.error ?? "Synchroniseren mislukt." };

    // Specificaties naar de echte specificatievelden van de shop schrijven.
    let specsUpdated = 0;
    let specsSkipped: string[] = [];
    if (data.specs.length > 0) {
      try {
        const specResult = await pushProductSpecs({
          ...creds,
          productId: data.productId,
          specs: data.specs,
          allowNew: data.allowNewSpecs,
        });
        specsUpdated = specResult.updated;
        specsSkipped = specResult.skipped;
      } catch (e) {
        console.error("[product-optimizer] spec push failed", e);
      }
    }

    // Gegenereerde afbeeldingen meesturen naar de shop.
    let imagesUploaded = 0;
    let imageError: string | undefined;
    const { data: saved } = await context.supabase
      .from("product_optimizations")
      .select("image_urls")
      .eq("shop_id", data.shopId)
      .eq("product_ref", data.productId)
      .maybeSingle();
    const paths = ((saved?.image_urls as string[] | null) ?? []).filter(Boolean);

    if (data.includeImages && paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const files: { filename: string; base64: string; title?: string }[] = [];
      for (const path of paths) {
        const dl = await supabaseAdmin.storage.from("product-images").download(path);
        if (dl.error || !dl.data) continue;
        const buf = Buffer.from(await dl.data.arrayBuffer());
        files.push({
          filename: path.split("/").pop() || `${Date.now()}.png`,
          base64: buf.toString("base64"),
          ...(data.fields.title ? { title: data.fields.title } : {}),
        });
      }
      if (files.length > 0) {
        const up = await uploadProductImages({
          ...creds,
          productId: data.productId,
          images: files,
        });
        imagesUploaded = up.uploaded;
        imageError = up.error;
      }
    }

    await context.supabase.from("product_optimizations").upsert(
      {
        shop_id: data.shopId,
        product_ref: data.productId,
        status: "synced",
        suggestions: {
          title: data.fields.title,
          seoTitle: data.fields.seoTitle,
          metaDescription: data.fields.metaDescription,
          description: data.fields.description,
          altTexts: data.altTexts,
        } as never,
      },
      { onConflict: "shop_id,product_ref" },
    );

    return {
      ok: true as const,
      altUpdated: result.altUpdated,
      specsUpdated,
      specsSkipped,
      imagesUploaded,
      imageError: imageError ?? null,
    };
  });


/** Genereert een nieuwe productafbeelding en bewaart die bij het product. */
export const generateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      productId: z.string().min(1),
      style: z.enum(["studio", "sfeer", "lifestyle"]).default("studio"),
      prompt: z.string().max(600).default(""),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { fetchProduct, generateProductImageBytes } = await import("./product-optimizer.server");
    const { product } = await fetchProduct({ ...creds, productId: data.productId, skipEnrichment: true });
    if (!product) return { ok: false as const, error: "Product niet gevonden." };

    try {
      const bytes = await generateProductImageBytes({
        product,
        style: data.style,
        extraPrompt: data.prompt,
      });
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
      return { ok: true as const, url: signed.data?.signedUrl ?? "", path };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Er ging iets mis." };
    }
  });

/** De specificatie-bibliotheek van de shop (alle specificatienamen + groepen). */
export const getSpecLibrary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { fetchSpecLibrary } = await import("./product-optimizer.server");
    try {
      const library = await fetchSpecLibrary(creds);
      return { ok: true as const, ...library };
    } catch (e) {
      console.error("[product-optimizer] spec library failed", e);
      return { ok: false as const, error: "De specificaties konden niet opgehaald worden." };
    }
  });

/** Specificaties zoals ze nu op één product staan. */
export const getProductSpecs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid(), productId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { fetchProductSpecs } = await import("./product-optimizer.server");
    try {
      const res = await fetchProductSpecs({ ...creds, productId: data.productId });
      return { ok: true as const, specs: res.specs, typeId: res.typeId };
    } catch (e) {
      console.error("[product-optimizer] product specs failed", e);
      return { ok: false as const, error: "De specificaties konden niet opgehaald worden." };
    }
  });

/** Hernoemt een specificatie in de bibliotheek (typo's rechtzetten). */
export const renameSpecification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      shopId: z.string().uuid(),
      attributeId: z.string().min(1),
      title: z.string().min(1).max(120),
    }),
  )
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { renameSpecAttribute } = await import("./product-optimizer.server");
    const res = await renameSpecAttribute({
      ...creds,
      attributeId: data.attributeId,
      title: data.title,
    });
    return res.ok
      ? { ok: true as const }
      : { ok: false as const, error: res.error ?? "Hernoemen mislukt." };
  });

/** Verwijdert een dubbele specificatie uit de bibliotheek. */
export const deleteSpecification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ shopId: z.string().uuid(), attributeId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const creds = await getShopCredentials(context.supabase as never, data.shopId);
    if (!creds) return { ok: false as const, error: "Geen actieve koppeling met je shop." };

    const { deleteSpecAttribute } = await import("./product-optimizer.server");
    const res = await deleteSpecAttribute({ ...creds, attributeId: data.attributeId });
    return res.ok
      ? { ok: true as const }
      : { ok: false as const, error: res.error ?? "Verwijderen mislukt." };
  });
