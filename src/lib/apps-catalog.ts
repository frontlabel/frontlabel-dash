export interface AppDefinition {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: "available" | "coming-soon";
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
  },
  {
    slug: "cookie-consent",
    name: "Cookie Consent",
    tagline: "GDPR-proof cookiebanner",
    description: "Binnenkort beschikbaar.",
    category: "Compliance",
    status: "coming-soon",
  },
  {
    slug: "review-prompts",
    name: "Review Prompts",
    tagline: "Vraag review op het juiste moment",
    description: "Binnenkort beschikbaar.",
    category: "Growth",
    status: "coming-soon",
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
  description: "Bevestig je geboortedatum om door te gaan.",
  buttonText: "Bevestigen",
  declineText: "Ik ben jonger",
  declineRedirect: "https://www.google.com",
  rememberDays: 30,
  primaryColor: "#2c7be5",
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