import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Abonnement & Facturatie — Frontlabel" },
      { name: "description", content: "Kies het pakket dat bij jouw webshop past. Wijzig of stop wanneer je wilt via Lightspeed." },
      { property: "og:title", content: "Abonnement & Facturatie — Frontlabel" },
      { property: "og:description", content: "Kies het pakket dat bij jouw webshop past. Wijzig of stop wanneer je wilt via Lightspeed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PricingPage,
});

type Interval = "monthly" | "yearly";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 9,
    priceYearly: 86.4,
    description: "Perfect als je slechts 1 specifieke add-on nodig hebt.",
    features: ["1 App naar keuze actief", "Basis statistieken", "Standaard support"],
    cta: "Kies Starter",
    variant: "secondary" as const,
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 24,
    priceYearly: 230.4,
    description: "Ideaal voor groeiende webshops die meer conversie willen.",
    features: [
      "Maximaal 3 Apps actief",
      "Uitgebreide Analytics & Health Score",
      "Eigen stijl presets instellen",
      "Snelle e-mail support",
    ],
    cta: "Kies Pro",
    variant: "default" as const,
    highlighted: true,
  },
  {
    id: "unlimited",
    name: "Unlimited All-in",
    priceMonthly: 39,
    priceYearly: 374.4,
    description: "Voor maximale omzet. Geen beperkingen.",
    features: [
      "Alle huidige én toekomstige Apps (Onbeperkt)",
      "Priority Support & Custom styling",
      "Realtime Activity Feed & Analytics",
      "Geen frontlabel branding",
    ],
    cta: "Kies Unlimited",
    variant: "dark" as const,
    highlighted: false,
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}

function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly");

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Abonnement & Facturatie"
        subtitle="Kies het pakket dat bij jouw webshop past. Wijzig of stop wanneer je wilt via Lightspeed."
      />

      <div className="px-6 pb-12 space-y-8">
        {/* Current plan banner */}
        <SectionCard className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Huidig plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Testversie / Gratis proefperiode</h2>
              <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Actief
              </Badge>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Volgende factuurdatum: <span className="font-medium text-foreground">Nog niet gepland</span>
          </div>
        </SectionCard>

        {/* Interval toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 rounded-lg bg-card border border-border shadow-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                interval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Maandelijks
            </button>
            <button
              type="button"
              onClick={() => setInterval("yearly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                interval === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Jaarlijks <span className="text-xs opacity-80">(20% korting)</span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} interval={interval} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground">
          Afhandeling van betalingen verloopt veilig en automatisch via je maandelijkse Lightspeed eCom factuur.
        </p>
      </div>
    </div>
  );
}

function PricingCard({
  plan,
  interval,
}: {
  plan: (typeof PLANS)[number];
  interval: Interval;
}) {
  const price = interval === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const period = interval === "monthly" ? "maand" : "jaar";

  return (
    <SectionCard
      className={cn(
        "relative flex flex-col p-6",
        plan.highlighted && "ring-2 ring-primary shadow-md",
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground border-0 shadow-sm uppercase tracking-wide text-[0.65rem]">
            Meest gekozen
          </Badge>
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <div className="mt-5">
        <span className="text-4xl font-bold tracking-tight text-foreground">{formatPrice(price)}</span>
        <span className="text-sm text-muted-foreground">/ {period}</span>
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
            <Check className={cn("h-4 w-4 shrink-0 mt-0.5", plan.variant === "dark" ? "text-emerald-400" : "text-primary")} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className={cn("mt-8 w-full", plan.variant === "dark" && "bg-foreground text-background hover:bg-foreground/90")}
        variant={plan.variant === "dark" ? "default" : plan.variant}
      >
        {plan.cta}
      </Button>
    </SectionCard>
  );
}
