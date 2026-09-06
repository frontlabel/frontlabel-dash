# Nieuwe app: Product Optimizer

Een app in het portaal die je producten uit de gekoppelde shop ophaalt, per product beoordeelt hoe compleet het is, en met AI verbeterde teksten, SEO, specificaties, alt-teksten en nieuwe productafbeeldingen voorstelt. Er wordt niets automatisch teruggeschreven naar je shop: je krijgt voorstellen die je kunt kopiëren of goedkeuren en bewaren.

&nbsp;

## Wat je te zien krijgt

**Tabblad 1 — Producten (standaard)**

- Lijst met alle producten uit je shop, met een volledigheidsscore van 0-100.
- Score is opgebouwd uit: titel, omschrijving (lengte), SEO-titel, meta description, specificaties, aantal afbeeldingen en alt-teksten.
- Sorteren op laagste score, zoeken op naam, filter "alleen onvolledig".
- Bovenaan: gemiddelde score van de shop en hoeveel producten aandacht nodig hebben.

**Tabblad 2 — Product detail**

- Twee kolommen: links het huidige product zoals het nu in je shop staat, rechts het AI-voorstel.
- Voorstellen per onderdeel, elk met een kopieerknop:
  - Productttitel en verkopende omschrijving
  - SEO-titel (max ~60 tekens) en meta description (max ~155 tekens)
  - Specificatielijst (ontbrekende kenmerken aangevuld)
  - Alt-teksten per bestaande afbeelding
- Knop "Genereer voorstel" en "Genereer opnieuw", met een checklist van wat er nog mist.

**Tabblad 3 — Afbeeldingen**

- Toont de bestaande productfoto's met waarschuwingen (te weinig foto's, ontbrekende alt-tekst).
- Knop om een nieuwe productafbeelding te laten genereren op basis van producttitel en omschrijving, met keuze uit stijl (witte achtergrond / sfeerbeeld / lifestyle).
- Gegenereerde afbeeldingen worden bewaard bij het product en zijn te downloaden.

**Tabblad 4 — Instellingen**

- Tone of voice (zakelijk, enthousiast, informatief), taal, doelgroep, merknaam.
- Standaard lengte van omschrijvingen en of specificaties in tabelvorm moeten.
- Aan/uit-schakelaar voor de app (met dezelfde bevestigingsdialoog als de andere apps).

Alle teksten in de interface zijn Nederlands, in dezelfde stijl als de bestaande app-pagina's (sticky header met broodkruimels, SectionCard-blokken, sticky opslaan-balk).

## Technisch

**Catalogus**

- Nieuwe entry `product-optimizer` in `src/lib/apps-catalog.ts` (categorie "Content", status available) plus een tegelafbeelding in `src/assets`.

**Database (migratie)**

- `product_optimizations`: `id`, `shop_id` (FK shops), `product_ref` (Lightspeed product-id), `product_title`, `score int`, `suggestions jsonb`, `image_urls text[]`, `status`, `created_at`, `updated_at` + `set_updated_at` trigger.
- RLS: alleen de eigenaar van de shop (`shops.owner_id = auth.uid()`) mag lezen/schrijven; GRANT SELECT/INSERT/UPDATE/DELETE op `authenticated`, GRANT ALL op `service_role`. Geen anon-toegang — dit is puur back-office.
- Storage bucket `product-images` (publiek leesbaar) voor gegenereerde afbeeldingen.

**Server**

- `src/lib/product-optimizer.server.ts`: producten ophalen uit Lightspeed (paginering, hergebruikt de aanpak van `shop-products.server.ts`), veld-extractie (titel, content, seo-title, seo-description, specificaties/custom fields, images + alt), en de scoreberekening.
- `src/lib/product-optimizer.functions.ts` (met `requireSupabaseAuth`):
  - `listOptimizableProducts` — producten + scores, ownership-check op de shop.
  - `generateProductSuggestions` — roept Lovable AI (`google/gemini-3-flash`) aan met een gestructureerde JSON-prompt en bewaart het resultaat in `product_optimizations`.
  - `generateProductImage` — Lovable AI image-model (`google/gemini-3-pro-image-preview`), uploadt naar de storage bucket en voegt de URL toe aan de rij.
- Lightspeed-credentials en `LOVABLE_API_KEY` worden binnen de handlers uit `process.env` gelezen; niets in de client.

**Routes**

- `src/routes/_authenticated/shops.$shopId.apps.product-optimizer.tsx` — de app-pagina met de vier tabbladen, opgezet zoals `shops.$shopId.apps.tile-calculator.tsx` (`useShellHeader`, `SectionCard`, `StickySaveBar`, `useDisableAppGuard`), instellingen opgeslagen in `shop_apps.settings`.
- Geen storefront-widget: deze app draait alleen in het portaal, dus er komt niets bij in `widget-scripts.server.ts` of het installatiescript.

**Foutafhandeling**

- Geen gekoppelde shop of verlopen koppeling → duidelijke melding met link naar de shoppagina.
- AI-fout of ratelimit (429/402) → nette Nederlandse melding via toast, geen lege staat.