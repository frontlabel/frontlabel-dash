// Server-only helpers voor het uitlezen van producten uit Lightspeed eCom.

export interface ShopProduct {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  image: string | null;
  category: string | null;
  handle: string | null;
}

function extractImage(p: Record<string, unknown>): string | null {
  const image = p.image as Record<string, unknown> | undefined;
  if (image && typeof image.src === "string") return image.src;
  return null;
}

function extractPrice(p: Record<string, unknown>): number | null {
  const price = p.price as Record<string, unknown> | undefined;
  const value = price?.price ?? price?.priceIncl;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchRandomShopProducts(opts: {
  apiKey: string;
  apiSecret: string;
  language?: string;
  count?: number;
}): Promise<ShopProduct[]> {
  const auth =
    "Basic " + Buffer.from(`${opts.apiKey}:${opts.apiSecret}`).toString("base64");
  const lang = (opts.language ?? "nl").toLowerCase();
  const base = `https://api.webshopapp.com/${encodeURIComponent(lang)}`;

  // Willekeurige pagina pakken zodat het niet altijd dezelfde producten zijn.
  const page = 1 + Math.floor(Math.random() * 3);
  const url = `${base}/products.json?limit=50&page=${page}`;
  let res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok && page > 1) {
    res = await fetch(`${base}/products.json?limit=50&page=1`, {
      headers: { Authorization: auth, Accept: "application/json" },
    });
  }
  if (!res.ok) return [];

  const data = (await res.json()) as { products?: Record<string, unknown>[] };
  const products = Array.isArray(data.products) ? data.products : [];
  const shuffled = products
    .map((p) => ({ p, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(({ p }) => p)
    .slice(0, opts.count ?? 5);

  return shuffled.map((p) => ({
    id: String(p.id ?? ""),
    title: String(p.fulltitle ?? p.title ?? "Product"),
    price: extractPrice(p),
    currency: "EUR",
    image: extractImage(p),
    category: typeof p.brand === "object" && p.brand
      ? String((p.brand as Record<string, unknown>).title ?? "")
      : null,
    handle: typeof p.url === "string" ? p.url : null,
  }));
}
