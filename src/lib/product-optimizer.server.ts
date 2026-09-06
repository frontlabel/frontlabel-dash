// Server-only helpers voor de Product Optimizer app.
// Leest producten uit Lightspeed eCom en berekent hoe compleet ze gevuld zijn.

export interface OptimizerProduct {
  id: string;
  title: string;
  fulltitle: string;
  /** Korte omschrijving / meta description in Lightspeed */
  description: string;
  /** Lange productinhoud (html) */
  content: string;
  brand: string | null;
  price: number | null;
  image: string | null;
  imageCount: number;
  url: string | null;
  visible: boolean;
  score: number;
  missing: string[];
}

export interface OptimizerProductImage {
  id: string;
  src: string;
  title: string;
}

function auth(apiKey: string, apiSecret: string) {
  return "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

function base(language?: string) {
  return `https://api.webshopapp.com/${encodeURIComponent((language ?? "nl").toLowerCase())}`;
}

function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Volledigheidsscore 0-100 op basis van de gevulde velden. */
export function scoreProduct(p: {
  title: string;
  fulltitle: string;
  description: string;
  content: string;
  brand: string | null;
  imageCount: number;
  /** True als het exacte aantal afbeeldingen bekend is (detailweergave). */
  imagesKnown?: boolean;
}): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;

  // Titel (15)
  if (p.title.length >= 10) score += 15;
  else if (p.title.length > 0) {
    score += 7;
    missing.push("Titel is erg kort");
  } else missing.push("Titel ontbreekt");

  // Lange titel / SEO-titel (15)
  const seoTitle = p.fulltitle || p.title;
  if (seoTitle.length >= 25 && seoTitle.length <= 65) score += 15;
  else if (seoTitle.length > 0) {
    score += 7;
    missing.push("SEO-titel heeft geen ideale lengte (25-65 tekens)");
  } else missing.push("SEO-titel ontbreekt");

  // Meta description (20)
  const meta = stripHtml(p.description);
  if (meta.length >= 100 && meta.length <= 160) score += 20;
  else if (meta.length > 0) {
    score += 8;
    missing.push("Meta description heeft geen ideale lengte (100-160 tekens)");
  } else missing.push("Meta description ontbreekt");

  // Productomschrijving (25)
  const content = stripHtml(p.content);
  if (content.length >= 400) score += 25;
  else if (content.length >= 120) {
    score += 14;
    missing.push("Productomschrijving is aan de korte kant");
  } else if (content.length > 0) {
    score += 6;
    missing.push("Productomschrijving is te kort");
  } else missing.push("Productomschrijving ontbreekt");

  // Specificaties: we herkennen lijst-opmaak in de inhoud (10)
  const hasSpecs = /<(ul|ol|table)/i.test(p.content ?? "");
  if (hasSpecs) score += 10;
  else missing.push("Geen specificaties of opsomming in de omschrijving");

  // Merk (5)
  if (p.brand) score += 5;
  else missing.push("Merk niet ingevuld");

  // Afbeeldingen (10)
  if (p.imageCount >= 3) score += 10;
  else if (p.imageCount >= 1) {
    if (p.imagesKnown) {
      score += 5;
      missing.push("Minder dan 3 productafbeeldingen");
    } else {
      score += 10;
    }
  } else missing.push("Geen productafbeelding");

  return { score: Math.max(0, Math.min(100, score)), missing };
}

/** Haalt het id uit een Lightspeed resource-verwijzing ({ resource: { id } }). */
function resourceId(value: unknown): string | null {
  const obj = value as { resource?: { id?: unknown } } | undefined;
  const id = obj?.resource?.id;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}

function mapProduct(
  p: Record<string, unknown>,
  extra?: { brands?: Map<string, string>; prices?: Map<string, number>; imagesKnown?: boolean },
): OptimizerProduct {
  const image = p.image as Record<string, unknown> | undefined;
  const id = String(p.id ?? "");
  const brandId = resourceId(p.brand);
  const brandTitle =
    (p.brand as Record<string, unknown> | undefined)?.title ??
    (brandId ? extra?.brands?.get(brandId) : undefined);

  const priceObj = p.price as Record<string, unknown> | undefined;
  const rawPrice = Number(priceObj?.priceIncl ?? priceObj?.price);
  const price = Number.isFinite(rawPrice) ? rawPrice : (extra?.prices?.get(id) ?? null);

  const rawCount = Number(p.imageCount);
  const imageCount = Number.isFinite(rawCount) ? rawCount : image ? 1 : 0;

  const item = {
    id,
    title: str(p.title),
    fulltitle: str(p.fulltitle),
    description: str(p.description),
    content: typeof p.content === "string" ? p.content : "",
    brand: typeof brandTitle === "string" && brandTitle ? brandTitle : null,
    price,
    image: image && typeof image.src === "string" ? image.src : null,
    imageCount,
    url: typeof p.url === "string" ? p.url : null,
    visible: p.isVisible !== false,
  };

  const { score, missing } = scoreProduct({ ...item, imagesKnown: extra?.imagesKnown ?? false });
  return { ...item, score, missing };
}

async function fetchBrandMap(headers: HeadersInit, language?: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${base(language)}/brands.json?limit=250`, { headers });
    if (!res.ok) return map;
    const data = (await res.json()) as { brands?: Record<string, unknown>[] };
    for (const b of data.brands ?? []) {
      const id = b.id;
      if ((typeof id === "number" || typeof id === "string") && typeof b.title === "string") {
        map.set(String(id), b.title);
      }
    }
  } catch {
    /* merken zijn optioneel */
  }
  return map;
}

async function fetchPriceMap(headers: HeadersInit, language?: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(`${base(language)}/variants.json?limit=250&page=${page}`, { headers });
      if (!res.ok) break;
      const data = (await res.json()) as { variants?: Record<string, unknown>[] };
      const rows = data.variants ?? [];
      for (const v of rows) {
        const productId = resourceId(v.product);
        const value = Number(v.priceIncl ?? v.price);
        if (productId && Number.isFinite(value) && !map.has(productId)) map.set(productId, value);
      }
      if (rows.length < 250) break;
    }
  } catch {
    /* prijzen zijn optioneel */
  }
  return map;
}

/** Haalt (maximaal maxPages × 250) producten op uit de shop, met merk en prijs. */
export async function fetchProducts(opts: {
  apiKey: string;
  apiSecret: string;
  language?: string;
  maxPages?: number;
}): Promise<OptimizerProduct[]> {
  const headers = { Authorization: auth(opts.apiKey, opts.apiSecret), Accept: "application/json" };
  const products: OptimizerProduct[] = [];
  const maxPages = opts.maxPages ?? 4;

  const [brands, prices] = await Promise.all([
    fetchBrandMap(headers, opts.language),
    fetchPriceMap(headers, opts.language),
  ]);

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${base(opts.language)}/products.json?limit=250&page=${page}`, { headers });
    if (!res.ok) break;
    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const rows = Array.isArray(data.products) ? data.products : [];
    products.push(...rows.map((p) => mapProduct(p, { brands, prices })));
    if (rows.length < 250) break;
  }

  return products;
}

export async function fetchProduct(opts: {
  apiKey: string;
  apiSecret: string;
  language?: string;
  productId: string;
}): Promise<{ product: OptimizerProduct | null; images: OptimizerProductImage[] }> {
  const headers = { Authorization: auth(opts.apiKey, opts.apiSecret), Accept: "application/json" };
  const id = encodeURIComponent(opts.productId);

  const res = await fetch(`${base(opts.language)}/products/${id}.json`, { headers });
  if (!res.ok) return { product: null, images: [] };
  const data = (await res.json()) as { product?: Record<string, unknown> };
  if (!data.product) return { product: null, images: [] };

  let images: OptimizerProductImage[] = [];
  try {
    const imgRes = await fetch(`${base(opts.language)}/products/${id}/images.json`, { headers });
    if (imgRes.ok) {
      const imgData = (await imgRes.json()) as { productImages?: Record<string, unknown>[] };
      images = (imgData.productImages ?? []).map((i) => ({
        id: String(i.id ?? ""),
        src: typeof i.src === "string" ? i.src : "",
        title: str(i.title),
      }));
    }
  } catch {
    images = [];
  }

  const [brands, prices] = await Promise.all([
    fetchBrandMap(headers, opts.language),
    fetchPriceMap(headers, opts.language),
  ]);

  const mapped = mapProduct(
    { ...data.product, imageCount: images.length || (data.product.image ? 1 : 0) },
    { brands, prices, imagesKnown: true },
  );
  return { product: mapped, images };
}

/** Schrijft goedgekeurde teksten terug naar het product in Lightspeed. */
export async function pushProductToShop(opts: {
  apiKey: string;
  apiSecret: string;
  language?: string;
  productId: string;
  fields: {
    title: string;
    seoTitle: string;
    metaDescription: string;
    description: string;
  };
  /** Alt-teksten per bestaande productafbeelding, op volgorde. */
  altTexts?: string[];
}): Promise<{ ok: boolean; altUpdated: number; error?: string }> {
  const headers = {
    Authorization: auth(opts.apiKey, opts.apiSecret),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const id = encodeURIComponent(opts.productId);

  const payload: Record<string, unknown> = {};
  if (opts.fields.title) payload.title = opts.fields.title;
  if (opts.fields.seoTitle) payload.fulltitle = opts.fields.seoTitle;
  if (opts.fields.metaDescription) payload.description = opts.fields.metaDescription;
  if (opts.fields.description) payload.content = opts.fields.description;

  if (Object.keys(payload).length > 0) {
    const res = await fetch(`${base(opts.language)}/products/${id}.json`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ product: payload }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[product-optimizer] push failed ${res.status}: ${body}`);
      return {
        ok: false,
        altUpdated: 0,
        error:
          res.status === 403
            ? "De API-sleutel heeft geen schrijfrechten op producten. Controleer de permissies in Lightspeed."
            : "Het product kon niet bijgewerkt worden in je shop.",
      };
    }
  }

  // Alt-teksten op de afbeeldingen (titelveld van de productafbeelding).
  let altUpdated = 0;
  const altTexts = (opts.altTexts ?? []).filter((t) => t.trim().length > 0);
  if (altTexts.length > 0) {
    try {
      const imgRes = await fetch(`${base(opts.language)}/products/${id}/images.json`, { headers });
      if (imgRes.ok) {
        const imgData = (await imgRes.json()) as { productImages?: Record<string, unknown>[] };
        const images = imgData.productImages ?? [];
        for (let i = 0; i < Math.min(images.length, altTexts.length); i++) {
          const imgId = images[i]?.id;
          if (typeof imgId !== "number" && typeof imgId !== "string") continue;
          const put = await fetch(
            `${base(opts.language)}/products/images/${encodeURIComponent(String(imgId))}.json`,
            {
              method: "PUT",
              headers,
              body: JSON.stringify({ productImage: { title: altTexts[i] } }),
            },
          );
          if (put.ok) altUpdated++;
        }
      }
    } catch {
      /* alt-teksten zijn optioneel */
    }
  }

  return { ok: true, altUpdated };
}

export interface OptimizerTone {
  tone: string;
  language: string;
  audience: string;
  brandName: string;
  descriptionLength: string;
}

export interface ProductSuggestions {
  title: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  specs: { label: string; value: string }[];
  altTexts: string[];
  tips: string[];
}

const SYSTEM_PROMPT =
  "Je bent een Nederlandse e-commerce copywriter en SEO-specialist. Je schrijft verkopende, feitelijk correcte productteksten. Verzin nooit technische specificaties die je niet kunt afleiden uit de aangeleverde informatie; laat ze dan weg. Antwoord uitsluitend met geldige JSON.";

/** Roept Lovable AI aan en geeft gestructureerde voorstellen terug. */
export async function generateSuggestions(opts: {
  product: OptimizerProduct;
  images: OptimizerProductImage[];
  settings: OptimizerTone;
}): Promise<ProductSuggestions> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is niet geconfigureerd.");

  const { product, settings } = opts;
  const userPrompt = [
    `Merk van de shop: ${settings.brandName || "onbekend"}`,
    `Doelgroep: ${settings.audience || "algemeen publiek"}`,
    `Tone of voice: ${settings.tone}`,
    `Taal: ${settings.language}`,
    `Gewenste lengte omschrijving: ${settings.descriptionLength}`,
    "",
    "Huidige productgegevens:",
    `- Titel: ${product.title || "(leeg)"}`,
    `- Lange titel: ${product.fulltitle || "(leeg)"}`,
    `- Merk: ${product.brand ?? "(leeg)"}`,
    `- Prijs: ${product.price ?? "(onbekend)"}`,
    `- Meta description: ${product.description || "(leeg)"}`,
    `- Omschrijving: ${stripHtml(product.content).slice(0, 4000) || "(leeg)"}`,
    `- Aantal afbeeldingen: ${opts.images.length}`,
    "",
    "Geef JSON met exact deze sleutels:",
    '{"title": string, "description": string (HTML met <p> en eventueel <ul><li>), "seoTitle": string (max 60 tekens), "metaDescription": string (max 155 tekens), "specs": [{"label": string, "value": string}], "altTexts": string[], "tips": string[]}',
    `Geef ${Math.max(1, opts.images.length)} alt-teksten, één per afbeelding, elk max 125 tekens.`,
  ].join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[product-optimizer] AI error ${res.status}: ${body}`);
    const err = new Error(
      res.status === 429
        ? "Te veel aanvragen. Probeer het over een minuut opnieuw."
        : res.status === 402
          ? "Onvoldoende AI-tegoed om dit voorstel te maken."
          : "Het voorstel kon niet gemaakt worden.",
    );
    throw err;
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<ProductSuggestions>;
  try {
    parsed = JSON.parse(raw) as Partial<ProductSuggestions>;
  } catch {
    throw new Error("Het AI-antwoord kon niet gelezen worden. Probeer het opnieuw.");
  }

  return {
    title: str(parsed.title),
    description: typeof parsed.description === "string" ? parsed.description : "",
    seoTitle: str(parsed.seoTitle),
    metaDescription: str(parsed.metaDescription),
    specs: Array.isArray(parsed.specs)
      ? parsed.specs
          .filter((s) => s && typeof s === "object")
          .map((s) => ({ label: str(s.label), value: str(s.value) }))
          .filter((s) => s.label && s.value)
      : [],
    altTexts: Array.isArray(parsed.altTexts) ? parsed.altTexts.map((a) => str(a)).filter(Boolean) : [],
    tips: Array.isArray(parsed.tips) ? parsed.tips.map((t) => str(t)).filter(Boolean) : [],
  };
}

const IMAGE_STYLES: Record<string, string> = {
  studio: "professionele productfoto op een egale witte studio-achtergrond, zachte schaduw, scherp en helder uitgelicht",
  sfeer: "sfeervolle productfoto in een natuurlijke omgeving met warm daglicht en ondiepe scherptediepte",
  lifestyle: "lifestyle productfoto waarin het product in gebruik is in een moderne woonomgeving",
};

/** Genereert één productafbeelding en geeft de ruwe bytes terug. */
export async function generateProductImageBytes(opts: {
  product: OptimizerProduct;
  style: string;
}): Promise<Uint8Array> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is niet geconfigureerd.");

  const styleText = IMAGE_STYLES[opts.style] ?? IMAGE_STYLES["studio"];
  const prompt = [
    `Productfoto van: ${opts.product.fulltitle || opts.product.title}.`,
    opts.product.brand ? `Merk: ${opts.product.brand}.` : "",
    stripHtml(opts.product.content).slice(0, 500),
    `Stijl: ${styleText}.`,
    "Geen tekst, geen logo's, geen watermerk. Vierkante uitsnede, e-commerce kwaliteit.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[product-optimizer] image error ${res.status}: ${body}`);
    throw new Error(
      res.status === 429
        ? "Te veel aanvragen. Probeer het over een minuut opnieuw."
        : res.status === 402
          ? "Onvoldoende AI-tegoed om een afbeelding te maken."
          : "De afbeelding kon niet gemaakt worden.",
    );
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };

  const b64 =
    json.data?.[0]?.b64_json ??
    json.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",").pop() ??
    json.data?.[0]?.url?.split(",").pop();

  if (!b64) throw new Error("De afbeelding kon niet gemaakt worden.");

  const binary = Buffer.from(b64, "base64");
  return new Uint8Array(binary);
}
