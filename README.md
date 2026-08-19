This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Camping-Finder

Mobile-first Next.js-App zum Finden von Campingplätzen im eigenen Umkreis per Radar-Diagramm (Fahrzeit = Distanz, Himmelsrichtung = Winkel), Filter-Sheet, Detail-Sheet mit Fotos und einem 2-stufigen Add-Flow.

Nachgebaut nach dem High-Fidelity-Design-Handoff (`Camping-Finder App.dc.html`).

### Places API (echte Fotos)

Das Detail-Sheet lädt Fotos automatisch über die Google Places API (New) via `/api/place-photos`. Ohne API-Key zeigt die App einen Platzhalter-Hinweis.

1. `cp .env.local.example .env.local`
2. `GOOGLE_PLACES_API_KEY` mit einem Key eintragen, der die "Places API (New)" aktiviert hat.

### Link-Analyse beim Hinzufügen neuer Plätze (Claude API)

Im Add-Flow ("+"-Button) liest die App den eingefügten Link serverseitig via `/api/analyze-link` und lässt Claude (`claude-opus-5`) Name, Region, Übernachtungsart, Strom, Öko-Level und Anlass daraus vorschlagen. Ohne `ANTHROPIC_API_KEY` zeigt der Analyse-Schritt eine Fehlermeldung statt eines Vorschlags.

`ANTHROPIC_API_KEY` in `.env.local` eintragen (Key aus der [Anthropic Console](https://console.anthropic.com/settings/keys)).

### Persistenz

Hinzugefügte/entfernte Plätze sowie Bewertungen und Statusänderungen (besucht/Wunsch) werden im `localStorage` des Browsers gespeichert und bleiben nach einem Reload erhalten. Es gibt aktuell kein Server-Backend — die Daten sind an das jeweilige Gerät/den jeweiligen Browser gebunden und werden z. B. beim Löschen der Browserdaten oder auf einem anderen Gerät nicht mitgenommen.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
