# azuretier.net

Full-stack interactive portfolio and gaming platform built with Next.js and TypeScript.

**Live**: [azuret.net](https://azuret.net)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Interactive homepage with selectable UI versions (Discord-style or Patreon-style) |
| `/play` | Multiplayer score attack game with real-time WebSocket gameplay |
| `/azure-supporter` | Discord role selection (EN/JP) with OAuth2 |
| `/current` | Portfolio |
| `/azure-community/[userId]` | Discord community user profiles |
| `/guilds/[guild_id]/rank-card/[display_name]` | Discord rank cards |
| `/blog` | Blog |

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, CSS Modules, Framer Motion
- **UI**: Radix UI primitives (shadcn/ui pattern)
- **3D/Graphics**: Three.js, WebGL shaders (GLSL), WebGPU
- **Real-time**: Socket.IO + WebSocket (`ws`)
- **Database**: Firebase (Firestore) — multiple projects per feature
- **Discord**: discord.js, OAuth2
- **i18n**: next-intl (Japanese default, English)
- **Deployment**: Vercel (frontend) + Railway (WebSocket server)

## Development

```bash
npm install

# Start dev server (Next.js + Socket.IO on port 3000)
npm run dev

# Start multiplayer WebSocket server (port 3001) in a separate terminal
npm run multiplayer

# Lint
npm run lint

# Production build
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and configure. Variables are grouped by feature:

| Prefix | Feature |
|--------|---------|
| `NEXT_PUBLIC_AZURE_SUPPORTER_*` | Discord community Firebase |
| `NEXT_PUBLIC_MNSW_*` | Voxel engine Firebase |
| `NEXT_PUBLIC_PORTFOLIO_*` | Portfolio Firebase |
| `NEXT_PUBLIC_RANKCARD_*` | Rank card Firebase |
| `NEXT_PUBLIC_RHYTHMIA_*` | Rhythmia game Firebase |
| `DISCORD_*` | Discord bot and OAuth2 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK |
| `NEXT_PUBLIC_MULTIPLAYER_URL` | WebSocket server URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics |

## Architecture

### Servers

1. **Main server** (`server.ts`, port 3000) — Next.js + Socket.IO for game room management
2. **Multiplayer server** (`multiplayer-server.ts`, port 3001) — Standalone WebSocket server with tick-based game state, ranked matchmaking, and reconnect support

### Project Structure

```
src/
  app/              Next.js App Router pages
    [locale]/       Locale-based routing (ja/en)
  components/       React components by feature
    home/           Homepage (v1.0.0 and v1.0.1 variants)
    rhythmia/       Rhythm game engine
    game/           Multiplayer game UI
    rank-card/      Discord rank card display
    blog/           Blog components
  lib/              Business logic by feature
    game/           Socket.IO room/player management
    multiplayer/    WebSocket room management
    ranked/         Ranked matchmaking + AI opponents
    advancements/   Achievement system
    discord-community/  Discord OAuth2 and roles
  hooks/            Custom React hooks
  i18n/             Internationalization config
  types/            TypeScript type definitions
  styles/           Global and module CSS

server.ts               Next.js + Socket.IO server
multiplayer-server.ts   Standalone WebSocket multiplayer server
messages/               i18n translation files (ja.json, en.json)
```

## Deployment

- **Frontend**: Vercel via git integration
- **WebSocket server**: Railway with health checks at `/health`

Set `NEXT_PUBLIC_MULTIPLAYER_URL` on Vercel to point to the Railway WebSocket URL (`wss://...`), and set `ALLOWED_ORIGINS` on Railway to the Vercel domain.

## License

Private repository.
