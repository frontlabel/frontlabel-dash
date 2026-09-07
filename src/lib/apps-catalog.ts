import ageCheckAsset from "@/assets/squares-agecheck.jpg.asset.json";
import backInStockAsset from "@/assets/squares-backinstock.jpg.asset.json";
import filterByStockAsset from "@/assets/squares-filterbystock.jpg.asset.json";
import instagramFeedAsset from "@/assets/squares-instagramfeed.jpg.asset.json";
import priceAlertAsset from "@/assets/squares-pricealert.jpg.asset.json";
import priceDropAsset from "@/assets/squares-pricedrop.jpg.asset.json";
import productOptimizerImg from "@/assets/squares-productoptimizer.jpg";
import tileCalculatorImg from "@/assets/squares-tilecalculator.jpg";

export interface AppDefinition {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: "available" | "coming-soon";
  image?: string;
}

export const APPS_CATALOG: AppDefinition[] = [
  {
    slug: "age-verification",
    name: "18+ Verificatie",
    tagline: "Geboortedatum-check popup voor je shop",
    description:
      "Toon bezoekers een leeftijdscheck voordat ze je shop binnenkomen. Volledig instelbaar in stijl en gedrag.",
    category: "Compliance",
    status: "available",
    image: ageCheckAsset.url,
  },
  {
    slug: "back-in-stock",
    name: "Back in Stock Alerts",
    tagline: "Turn out-of-stock products into recovered revenue.",
    description: "Laat klanten zich aanmelden voor een notificatie zodra een product weer op voorraad is.",
    category: "Conversie",
    status: "available",
    image: backInStockAsset.url,
  },
  {
    slug: "filter-by-stock",
    name: "Filter by stock",
    tagline: "Laat bezoekers filteren op voorraadstatus",
    description: "Binnenkort beschikbaar.",
    category: "Merchandising",
    status: "coming-soon",
    image: filterByStockAsset.url,
  },
  {
    slug: "instagram-feed",
    name: "Instagram feed",
    tagline: "Toon je laatste Instagram posts op je shop",
    description: "Binnenkort beschikbaar.",
    category: "Social",
    status: "coming-soon",
    image: instagramFeedAsset.url,
  },
  {
    slug: "price-alert",
    name: "Price alert",
    tagline: "Mail klanten zodra hun streefprijs gehaald wordt",
    description:
      "Bezoekers laten een e-mailadres en hun gewenste prijs achter. Zodra de prijs op of onder dat bedrag zakt, sturen we hen automatisch een melding.",
    category: "Conversie",
    status: "available",
    image: priceAlertAsset.url,
  },
  {
    slug: "price-drop-deal",
    name: "Price drop deal",
    tagline: "Tijdgebonden afslag-acties op je shop",
    description: "Binnenkort beschikbaar.",
    category: "Marketing",
    status: "coming-soon",
    image: priceDropAsset.url,
  },
  {
    slug: "product-optimizer",
    name: "Product optimizer",
    tagline: "Vul je producten compleet met AI-voorstellen",
    description:
      "Zie per product hoe compleet het gevuld is en laat AI betere teksten, SEO-titel, meta description, specificaties, alt-teksten en nieuwe productafbeeldingen voorstellen.",
    category: "Content",
    status: "available",
    image: productOptimizerImg,
  },
  {
    slug: "tile-calculator",
    name: "Vloer & wand calculator",
    tagline: "Bereken benodigde hoeveelheid voor tegels, laminaat, tapijt, behang of verf",
    description:
      "Bezoekers vullen de afmetingen van hun ruimte in en zien direct hoeveel ze nodig hebben — voor tegels, laminaat, tapijt, behang, verf of elk ander product dat per m² wordt berekend.",
    category: "Conversie",
    status: "available",
    image: tileCalculatorImg,
  },
];

export function getApp(slug: string): AppDefinition | undefined {
  return APPS_CATALOG.find((a) => a.slug === slug);
}

export interface AgeVerificationSettings {
  minAge: number;
  title: string;
  description: string;
  buttonText: string;
  declineText: string;
  declineRedirect: string;
  rememberDays: number;
  primaryColor: string;
  textColor: string;
  backgroundColor: string;
  overlayColor: string;
  overlayOpacity: number;
  fontFamily: string;
  backgroundImageUrl: string;
  borderRadius: number;
  blockUnderage: boolean;
  blockDays: number;
}

export const DEFAULT_AGE_VERIFICATION: AgeVerificationSettings = {
  minAge: 18,
  title: "Welkom",
  description: "Bevestig je leeftijd om door te gaan.",
  buttonText: "Ja, ik ben 18 jaar en ouder",
  declineText: "Nee",
  declineRedirect: "https://www.google.com",
  rememberDays: 30,
  primaryColor: "#5187e0",
  textColor: "#1f2937",
  backgroundColor: "#ffffff",
  overlayColor: "#0f172a",
  overlayOpacity: 0.75,
  fontFamily: "Inter",
  backgroundImageUrl: "",
  borderRadius: 12,
  blockUnderage: true,
  blockDays: 365,
};

export const FONT_OPTIONS = [
  "Inter",
  "system-ui",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
];

export function hexToRgba(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (!hex) return `rgba(0,0,0,${a})`;
  if (hex.startsWith("rgb")) return hex; // already rgba/rgb — leave as-is
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
/** Sub-tabbladen per app, gebruikt voor snelle navigatie in de zijbalk. */
export const APP_TABS: Record<string, { id: string; label: string }[]> = {
  "age-verification": [
    { id: "algemeen", label: "Algemeen" },
    { id: "inhoud", label: "Inhoud" },
    { id: "design", label: "Design" },
    { id: "regels", label: "Regels" },
  ],
  "back-in-stock": [
    { id: "overview", label: "Overzicht & analyses" },
    { id: "widget", label: "Widget-ontwerp" },
    { id: "email", label: "E-mail configuratie" },
    { id: "waitlist", label: "Wachtlijst" },
  ],
  "price-alert": [
    { id: "overview", label: "Overzicht & analyses" },
    { id: "widget", label: "Widget-ontwerp" },
    { id: "email", label: "E-mail configuratie" },
    { id: "alerts", label: "Aanmeldingen" },
  ],
  "product-optimizer": [
    { id: "products", label: "Producten" },
    { id: "detail", label: "Product detail" },
    { id: "specs", label: "Specificaties" },
    { id: "images", label: "Afbeeldingen" },
    { id: "settings", label: "Instellingen" },
  ],
  "tile-calculator": [
    { id: "overview", label: "Overzicht" },
    { id: "widget", label: "Instellingen" },
    { id: "preview", label: "Live voorbeeld" },
  ],
};
