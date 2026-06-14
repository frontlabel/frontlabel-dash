import React from "react";
import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  productTitle?: string;
  productImageUrl?: string;
  shopName?: string;
}

const Email = ({ productTitle = "dit product", productImageUrl, shopName = "de webshop" }: Props) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je bent aangemeld voor een voorraadmelding</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Aanmelding bevestigd</Heading>
        <Text style={text}>
          Bedankt! We hebben je aanmelding ontvangen voor een melding zodra <strong>{productTitle}</strong> weer
          op voorraad is bij {shopName}.
        </Text>
        {productImageUrl ? (
          <Section style={{ textAlign: "center", margin: "20px 0" }}>
            <Img src={productImageUrl} alt={productTitle} width="200" style={{ borderRadius: 8, margin: "0 auto" }} />
          </Section>
        ) : null}
        <Text style={text}>
          Zodra het product weer leverbaar is, sturen we je direct een e-mail.
        </Text>
        <Text style={muted}>Je ontvangt deze e-mail omdat je je hebt aangemeld voor een voorraadmelding.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, unknown>) =>
    `Aanmelding bevestigd${d.productTitle ? ` — ${String(d.productTitle)}` : ""}`,
  displayName: "Back in stock — bevestiging",
  previewData: { productTitle: "Nike Air Max 90", shopName: "Voorbeeldshop" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Lato, Arial, sans-serif", color: "#1f2937" };
const container = { padding: "32px 24px", maxWidth: 560, margin: "0 auto" };
const h1 = { fontSize: 22, fontWeight: 700, margin: "0 0 16px" };
const text = { fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" };
const muted = { fontSize: 12, color: "#6b7280", marginTop: 24 };