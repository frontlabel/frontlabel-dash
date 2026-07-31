// Server-only: Lightspeed eCom OAuth2 flow (token exchange + opslag in Supabase).
import process from "node:process";

export interface LightspeedTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  shop_id?: number | string;
  shop_language?: string;
  error?: string;
  error_description?: string;
}

export interface LightspeedShopInfo {
  id: number;
  domain: string | null;
  language: string;
}

export interface LightspeedOAuthResult {
  ok: boolean;
  status: number;
  shopId?: number;
  error?: string;
}

function basicAuth(apiKey: string, apiSecret: string) {
  return "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
}

/** Step 2: wissel de authorization code in voor een permanent access token. */
export async function exchangeCodeForToken(opts: {
  code: string;
  language: string;
  clientId: string;
  clientSecret: string;
}): Promise<LightspeedTokenResponse> {
  const url = `https://api.webshopapp.com/${encodeURIComponent(opts.language)}/oauth/access_token`;
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code: opts.code,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: LightspeedTokenResponse;
  try {
    parsed = JSON.parse(text) as LightspeedTokenResponse;
  } catch {
    throw new Error(`Ongeldig antwoord van Lightspeed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || !parsed.access_token) {
    throw new Error(
      parsed.error_description ?? parsed.error ?? `Token exchange mislukt (${res.status})`,
    );
  }
  return parsed;
}

/** Haalt shop-ID + domein op met het verkregen token (api_key = shop_id, api_secret = token). */
export async function fetchShopInfo(opts: {
  apiKey: string;
  apiSecret: string;
  language: string;
}): Promise<LightspeedShopInfo | null> {
  const res = await fetch(
    `https://api.webshopapp.com/${encodeURIComponent(opts.language)}/account.json`,
    {
      headers: {
        Authorization: basicAuth(opts.apiKey, opts.apiSecret),
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    account?: { id?: number; shopDomain?: string; domain?: string; language?: string };
  };
  const acc = data.account;
  if (!acc?.id) return null;
  return {
    id: Number(acc.id),
    domain: acc.shopDomain ?? acc.domain ?? null,
    language: acc.language ?? opts.language,
  };
}

/** Step 3: sla de shop + token op (insert of update op shop_id). */
export async function upsertShop(info: {
  shopId: number;
  shopDomain: string | null;
  accessToken: string;
  apiKey: string;
  language: string;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("shops")
    .select("id")
    .eq("shop_id", info.shopId)
    .maybeSingle();

  const payload = {
    shop_id: info.shopId,
    shop_domain: info.shopDomain,
    access_token: info.accessToken,
    api_key: info.apiKey,
    api_secret: info.accessToken,
    api_language: info.language,
    status: "active",
    ecom_url: info.shopDomain ? `https://${info.shopDomain}` : null,
  };

  if (existing?.id) {
    const { error } = await supabaseAdmin.from("shops").update(payload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabaseAdmin.from("shops").insert({
    ...payload,
    name: info.shopDomain ?? `Lightspeed shop ${info.shopId}`,
    plan_type: "free_trial",
  });
  if (error) throw new Error(error.message);
}

/** Volledige callback-afhandeling; geeft een Response terug (redirect of foutmelding). */
export async function handleLightspeedCallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const language = (url.searchParams.get("language") ?? "nl").toLowerCase();

  if (!code) {
    return errorResponse(400, "Ontbrekende `code` parameter in de Lightspeed callback.");
  }

  const clientId = process.env["LIGHTSPEED_API_KEY"];
  const clientSecret = process.env["LIGHTSPEED_API_SECRET"];
  if (!clientId || !clientSecret) {
    return errorResponse(500, "Lightspeed API-gegevens zijn niet geconfigureerd op de server.");
  }

  try {
    const token = await exchangeCodeForToken({ code, language, clientId, clientSecret });
    const accessToken = token.access_token!;
    const tokenShopId = token.shop_id != null ? Number(token.shop_id) : undefined;
    const lang = (token.shop_language ?? language).toLowerCase();

    // api_key voor de Lightspeed REST API is het shop-ID (of het token zelf als fallback).
    const apiKey = String(tokenShopId ?? accessToken);
    const info = await fetchShopInfo({ apiKey, apiSecret: accessToken, language: lang });

    const shopId = info?.id ?? tokenShopId;
    if (!shopId) {
      return errorResponse(502, "Lightspeed gaf geen shop-ID terug.");
    }

    await upsertShop({
      shopId,
      shopDomain: info?.domain ?? null,
      accessToken,
      apiKey,
      language: info?.language ?? lang,
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `/dashboard?shop_id=${shopId}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("[lightspeed-oauth]", message);
    return errorResponse(502, `Koppelen met Lightspeed mislukt: ${message}`);
  }
}

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}