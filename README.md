# Boer Transitie Scanner

## Opstarten

```bash
cd "boer-transitie-scanner"
npm install      # eenmalig
npm run dev      # start op http://localhost:5173
```

## Structuur

```
src/
  store/          → Zustand state (percelen, antwoorden, scenario's)
  services/       → PDOK API + scenario-engine
  components/     → Layout, navigatie
  pages/          → Landing, Kaart, Vragen, Resultaat, CTA
```

## PDOK endpoints

- BRP percelen WFS: https://service.pdok.nl/rvo/brpgewaspercelen/wfs/v1_0
- Natura 2000 WFS: https://service.pdok.nl/mlnp/natura2000/wfs/v1_0
- Achtergrondkaart WMTS: https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0

## Fase-overzicht

- **Fase 1 (nu):** Werkende app, kaart, PDOK, scenario-engine hardcoded
- **Fase 2:** Backend + Supabase + leadcapture HubSpot
- **Fase 3:** Fiscale regelengine + subsidie-database
- **Fase 4:** Anthropic API voor AI-scenario's + rapportgeneratie

## Online versie (GitHub Pages)

Elke push naar `main` bouwt de app automatisch en zet hem live op
https://reinoud01.github.io/boerenAI/ (workflow: `.github/workflows/deploy.yml`).

Wil je de kennisbank-zoekfunctie (Supabase) ook online aan hebben, zet dan in de repo
onder Settings → Secrets and variables → Actions de secrets `VITE_SUPABASE_URL` en
`VITE_SUPABASE_ANON_KEY`. Zonder die secrets werkt de rest van de app gewoon.
