# Fihuma Collectief Proposal Builder v1

Professionele offerte-engine voor Fihuma Collectief / Fihuma Isolatie.

## Kern

- Next.js + React + TailwindCSS
- Component-gebaseerde offerteopbouw, geen Word-merge of mega-tabel
- Live preview in de builder
- PDF generatie via HTML/CSS print styling en Playwright
- Veilige Pipedrive API-routes aan serverzijde
- Klaar om Supabase/PostgreSQL persistence aan te sluiten

## Lokaal starten

```bash
npm install
npm run dev
```

Open daarna `http://localhost:3000`.

## Belangrijke routes

- `/dashboard` overzicht offertes
- `/create?deal_id=1234` builder vanuit Pipedrive
- `/admin/advisors` adviseursbeheer
- `/api/pipedrive/deal/[dealId]` klantdata ophalen
- `/api/proposals/[id]/pdf` vector PDF genereren
- `/api/proposals/[id]/upload` PDF uploaden naar Pipedrive deal

## Architectuur

De offerte bestaat uit losse proposal blocks: cover, situatie, productinformatie, waarom Fihuma, maatregelblokken, pricing summary en akkoordpagina. De PDF-route rendert dezelfde data via HTML/CSS naar print-ready PDF, met `break-inside: avoid` per blok.
