# Product optimizer: opslaan-knop, afbeeldingsformaat, specificaties en app-volgorde

## 1. Icoon weg uit de opslaan-knop
De diskette-icoontjes verdwijnen uit de "Opslaan"-knoppen op de product optimizer-pagina (onderbalk, header en "Volgorde opslaan"); alleen tekst blijft over. De laadspinner tijdens opslaan blijft wel staan.

## 2. Gegenereerde afbeeldingen op 1024x1024
De beeldgeneratie krijgt een expliciet vierkant formaat van 1024x1024 pixels mee, in plaats van alleen de tekstuele hint "vierkante uitsnede". Als het formaat na generatie afwijkt, wordt de afbeelding server-side naar exact 1024x1024 bijgesneden/geschaald voordat hij wordt opgeslagen.

## 3. Specificaties: nu tekst, straks echte specificaties
Vandaag zet de app de voorgestelde specificaties alleen in de omschrijvingstekst; ze belanden niet in de specificatievelden van de webshop. Voorstel:

**Eén centrale specificaties-bibliotheek per shop, plus koppeling per product.**

- Nieuwe tab "Specificaties" op appniveau (naast de productlijst), die alle bestaande specificatie-namen en -waarden uit de shop ophaalt en toont: hoe vaak elke naam voorkomt, welke waarden erbij horen.
- De bibliotheek is de enige bron: bij een productvoorstel mag de AI alleen kiezen uit bestaande namen/waarden. Alleen wanneer er echt niets past, komt er een voorstel "nieuwe specificatie" dat je expliciet moet goedkeuren voordat hij aan de bibliotheek wordt toegevoegd. Zo ontstaan er geen dubbele of verkeerd gespelde varianten.
- In de bibliotheek-tab kun je bijna-identieke namen/waarden (bijv. "Kleur" / "kleur" / "Kleurr") zien en samenvoegen naar één juiste schrijfwijze.
- Bij "Push naar shop" worden de goedgekeurde specificaties als echte specificaties naar de shop geschreven, niet meer in de omschrijving. De bestaande instelling "specificaties als tabel kopiëren" blijft bestaan voor wie ze tóch in de tekst wil.

Eerste stap in de uitvoering is verifiëren hoe specificaties in de shopkoppeling heten en welke schrijfacties de koppeling toestaat; blijkt schrijven niet mogelijk, dan wordt de bibliotheek read-only met een kopieer-actie en meld ik dat.

## 4. Geïnstalleerde apps bovenaan
Op de Apps-overzichtspagina worden geïnstalleerde apps altijd eerst getoond, daarna de overige beschikbare apps, en als laatste de "Binnenkort"-apps.

## Technisch
- `src/routes/_authenticated/shops.$shopId.apps.product-optimizer.tsx`: `Save`-icoon verwijderen; nieuwe specificaties-tab en goedkeuringsflow.
- `src/lib/product-optimizer.server.ts`: beeldprompt/afmeting 1024x1024; specificaties-endpoints van de shop-API (filters/filterwaarden) uitlezen en schrijven; AI-prompt beperken tot bestaande labels/waarden.
- `src/lib/product-optimizer.functions.ts`: server functions voor bibliotheek ophalen, samenvoegen en specificaties meesturen bij push.
- `src/routes/_authenticated/apps.tsx`: sorteervolgorde geïnstalleerd > beschikbaar > binnenkort.
