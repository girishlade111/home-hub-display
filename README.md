# Home Hub Display

A Nest-Hub-style smart display for the web: a fullscreen photo slideshow with a live clock, weather, and display settings — perfect for a wall-mounted tablet or a kiosk screen.

Originally generated with [v0.app](https://v0.app), now maintained as a standalone open-source project.

## Features

- **Fullscreen photo slideshow** — autoplay with play/pause, next/previous, photo info overlay
- **Live clock + weather** — current time, temperature, condition, humidity, wind speed
- **Multiple photo sources** —
  - **Google Photos** (via API)
  - **Immich** (self-hosted photo server)
  - **Local files** (served from the server's filesystem)
- **Display settings** — weather toggle, night mode, mute, transition timing
- **Fullscreen + kiosk helpers** — one-tap fullscreen, auto-hiding controls on inactivity
- **Keyboard shortcuts** — built-in shortcuts help dialog
- **Dark UI** — designed for always-on displays

## Tech Stack

- [Next.js](https://nextjs.org) 15 (App Router with API routes — requires a Node server)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix primitives)
- [Lucide](https://lucide.dev) icons
- [Immich](https://immich.app) API for self-hosted photos; [OpenWeatherMap](https://openweathermap.org) for weather

## Quick Start

```bash
# install dependencies
npm install
# or: pnpm install

# run the dev server
npm run dev
# open http://localhost:3000

# production
npm run build
npm start
```

## Project Structure

```
app/
  page.tsx            # main display: slideshow, clock, weather, settings
  layout.tsx          # root layout, theme provider
  globals.css         # Tailwind + custom styles
  api/
    photos/
      google/route.ts   # Google Photos source
      immich/route.ts   # Immich self-hosted source
      local/route.ts    # local filesystem source
      serve/route.ts    # serves local image bytes
    weather/route.ts    # weather proxy (OpenWeatherMap)
components/
  photo-source-settings.tsx   # source + display settings UI
  keyboard-shortcuts-help.tsx
  theme-provider.tsx
  ui/                         # shadcn/ui primitives
lib/
  photo-service.ts    # unified photo-fetching layer
  fullscreen-utils.ts
  utils.ts
public/               # static assets
```

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `OPENWEATHER_API_KEY` | Live weather via OpenWeatherMap (geocoding + weather). Without it, the app serves mock weather data (72°F, Partly Cloudy). | No (optional) |
| Google Photos credentials | Needed to pull from Google Photos — configure per the Google Photos API docs. | Only for Google Photos source |
| Immich API key / URL | Needed for the Immich self-hosted source — configure in the settings UI. | Only for Immich source |

## Deployment

This app **needs a Node.js server** (it has API routes), so it cannot be statically exported to GitHub Pages. Deploy options:

- **Vercel** (recommended): import the repo; `npm run build` + `npm start` works out of the box. Set `OPENWEATHER_API_KEY` in the project env vars.
- **Any Node host** (Railway, Render, VPS, Docker): run `npm run build && npm start`.
- **Raspberry Pi / kiosk**: great fit — point a fullscreen Chromium at the deployed URL.

## Security Note

Next.js is pinned to **15.2.8**, which includes patches for CVE-2025-55182 (React2Shell RCE) and related advisories affecting older 15.2.x releases. Keep it updated.

---

Built by Girish Lade — [ladestack.in](https://ladestack.in)
