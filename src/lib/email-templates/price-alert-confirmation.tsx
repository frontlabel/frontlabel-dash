import React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  productTitle?: string;
  productImageUrl?: string;
  targetPrice?: number;
  currency?: string;
  shopName?: string;
}

function formatPrice(amount?: number, currency = "EUR") {
  if (typeof amount !== "number") return "";
  try {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const Email = ({ productTitle = "dit product", productImageUrl, targetPrice, currency = "EUR", shopName = "de webshop" }: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je prijswaarschuwing is ingesteld</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Prijswaarschuwing ingesteld</Heading>
        <Text style={text}>
          We hebben je prijswaarschuwing voor <strong>{productTitle}</strong> bij {shopName} ontvangen.
        </Text>
        {productImageUrl ? (
          <Section style={{ textAlign: "center", margin: "20px 0" }}>
            <Img src={productImageUrl} alt={productTitle} width="200" style={{ borderRadius: 8, margin: "0 auto" }} />
          </Section>
        ) : null}
        <Text style={text}>
          We sturen je een e-mail zodra de prijs <strong>{formatPrice(targetPrice, currency)}</strong> of lager is.
        </Text>
        <Text style={muted}>Je ontvangt deze e-mail omdat je je hebt aangemeld voor een prijswaarschuwing.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    `Prijswaarschuwing ingesteld${d.productTitle ? ` — ${String(d.productTitle)}` : ""}`,
  displayName: "Price alert — bevestiging",
  previewData: { productTitle: "Nike Air Max 90", targetPrice: 89.99, currency: "EUR", shopName: "Voorbeeldshop" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Lato, Arial, sans-serif", color: "#1f2937" };
const container = { padding: "32px 24px", maxWidth: 560, margin: "0 auto" };
const h1 = { fontSize: 22, fontWeight: 700, margin: "0 0 16px" };
const text = { fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" };
const muted = { fontSize: 12, color: "#6b7280", marginTop: 24 };