# CLAUDE.md - AI Assistant Guide for azuretier.net

## Project Overview

**azuretier.net** (package name: `azuret.net`) is a full-stack interactive portfolio and gaming platform built with Next.js 16 and TypeScript. It features multiplayer rhythm/battle games (Rhythmia) with ranked matchmaking, an advancements (achievements) system, Discord community integration, rank card systems, a blog, and WebGL/Three.js visual effects. The site is internationalized with next-intl, supporting Japanese (default) and English locales.

## Tech Stack

- **Framework**: Next.js 16.1.5 (App Router) with React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4 + CSS Modules + Framer Motion 11
- **UI Components**: Radix UI primitives (shadcn/ui pattern)
- **3D/Graphics**: Three.js 0.179, WebGL shaders (GLSL), WebGPU (experimental)
- **Real-time**: Socket.IO 4.8 + raw WebSocket (`ws`)
- **Database**: Firebase 12 (Firestore) + Firebase Admin 13 — multiple projects for different features
- **Discord**: discord.js 14 + OAuth2
- **Internationalization**: next-intl 4.8 (ja/en locales, `as-needed` prefix strategy)
- **Analytics**: Google Analytics via `@next/third-parties`
- **Deployment**: Vercel (main app) + Railway (multiplayer WebSocket server)

## Commands

```bash
npm run dev          # Start dev server with Socket.IO (localhost:3000)
npm run build        # Next.js production build + next-sitemap
npm run start        # Production server with Socket.IO
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run multiplayer  # Start standalone WebSocket multiplayer server (port 3001)
```

> **Note**: Discord bot scripts (`bot:*`) are defined in package.json but the `apps/discord-bot/` directory does not exist in the repository. These scripts are non-functional.

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Minimal root layout (delegates to [locale])
│   ├── provider.tsx        # Client providers (AnimatePresence → ThemeProvider → NotificationProvider)
│   ├── [locale]/           # Locale-based routing (next-intl)
│   │   ├── layout.tsx      # Main layout (NextIntlClientProvider → VersionProvider → Provider)
│   │   └── page.tsx        # Home page (Rhythmia game)
│   ├── blog/               # Blog route
│   ├── shader-demo/        # WebGL shader demo route
│   ├── sns-widgets/        # Social media widgets route
│   ├── sunphase/           # WebGPU heartbeat demo route
│   └── fonts/              # Local font files (Geist Sans + Mono)
├── components/             # React components organized by feature
│   ├── home/               # Homepage components (v1.0.0 and v1.0.1 variants)
│   ├── rhythmia/           # Rhythm game — main game, tetris engine, multiplayer, ranked
│   ├── game/               # Multiplayer game UI (lobby, leaderboard, room creation)
│   ├── effects/            # Visual effects (floating particles)
│   ├── portfolio/          # Portfolio display (WindowFrame)
│   ├── rank-card/          # Discord rank card components
│   ├── blog/               # Blog components (navbar, profile, post-card)
│   ├── MNSW/               # Voxel engine UI (panorama background)
│   ├── sns-widgets/        # Social widgets (Discord, GitHub, YouTube, Twitter, Instagram)
│   ├── version/            # Version selector UI (VersionSelector, FloatingVersionSwitcher)
│   └── main/               # Shared UI components (Button, animations, utilities)
├── lib/                    # Business logic and utilities
│   ├── game/               # GameManager (Socket.IO room/player management)
│   ├── multiplayer/        # RoomManager + FirestoreRoomService (WebSocket rooms)
│   ├── ranked/             # Ranked matchmaking (TetrisAI, tiers, queue management)
│   ├── advancements/       # Achievements system (definitions, Firestore sync, local storage)
│   ├── notifications/      # Notification context provider and types
│   ├── discord-community/  # Discord OAuth2, role management, rank-card-service
│   ├── rank-card/          # Rank card generation (firebase, firebase-admin, utils)
│   ├── rhythmia/           # Game-specific logic (firebase)
│   ├── portfolio/          # Portfolio data (firebase)
│   ├── MNSW/               # Voxel engine (TextureUtils, VoxelEngine, firebase)
│   ├── version/            # Version selection context + local storage persistence
│   ├── intent/             # Intent parser for command interpretation
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── hooks/                  # Custom React hooks
│   ├── useGameSocket.ts    # Socket.IO connection hook
│   ├── use-mobile.ts       # Mobile detection
│   ├── use-kv.ts           # Key-value storage
│   └── useLocalStorage.ts  # Local storage persistence
├── i18n/                   # Internationalization configuration
│   ├── routing.ts          # Locale routing (ja default, en secondary, as-needed prefix)
│   ├── request.ts          # next-intl server request config
│   └── navigation.ts       # Locale-aware navigation helpers
├── types/                  # TypeScript type definitions
│   ├── game.ts             # Socket.IO event types (Player, Room, GAME_CONFIG)
│   ├── multiplayer.ts      # WebSocket protocol types (ClientMessage, ServerMessage)
│   └── community.ts        # Discord community types (RuleProgress)
├── styles/                 # Global and module CSS
└── middleware.ts            # next-intl middleware for locale detection/routing

# Root-level files
server.ts                   # Custom Next.js + Socket.IO server
multiplayer-server.ts       # Standalone WebSocket multiplayer server
messages/                   # i18n translation files (ja.json, en.json)
declarations.d.ts           # Type declarations (GLSL, WGSL, WebGPU, Spark SDK)
rhythmia.config.json        # Game version configuration
```

### Server Architecture

The project runs two separate servers:

1. **Main server** (`server.ts`): Custom Node HTTP server wrapping Next.js with Socket.IO for game room management (create/join/leave rooms, score events, reconnection). Port 3000.
2. **Multiplayer server** (`multiplayer-server.ts`): Standalone WebSocket server for lower-latency room-based multiplayer with tick-based game state (10 ticks/second). Includes ranked matchmaking queue (8s timeout with AI fallback), reconnect tokens, and heartbeat keepalive (15s interval). Port 3001.

### Provider Hierarchy

```
<html lang={locale}>                          ← Dynamic locale from next-intl
  <NextIntlClientProvider messages={messages}> ← i18n translations
    <VersionProvider>                          ← UI version selection context
      <AnimatePresence>                        ← Framer Motion page transitions
        <ThemeProvider>                        ← next-themes (dark mode default, class strategy)
          <NotificationProvider>               ← In-app notification context
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </AnimatePresence>
    </VersionProvider>
  </NextIntlClientProvider>
</html>
```

### Internationalization (next-intl)

- **Locales**: `ja` (default, no URL prefix) and `en` (prefix `/en`)
- **Strategy**: `as-needed` — Japanese pages have no locale prefix, English pages are prefixed
- **Messages**: JSON files in `messages/` directory (`ja.json`, `en.json`)
- **Middleware**: `src/middleware.ts` handles locale detection and routing
- **Routing config**: `src/i18n/routing.ts` defines supported locales and prefix strategy
- **SEO**: `[locale]/layout.tsx` generates localized metadata with `hreflang` alternates

### Key Feature Systems

**Rhythmia Game Engine** (`components/rhythmia/`):
- Standalone tetris engine with hooks (useGameState, useAudio, useRhythmVFX)
- Multiple game modes: Vanilla, Multiplayer Battle, Ranked Match
- Visual variants: WebGPU stage, forest campfire scene, voxel world background
- Crafting UI, health/mana HUD, item system

**Ranked Matchmaking** (`lib/ranked/`):
- Tier-based ranking system with points, divisions, bus fares, and win rewards
- TetrisAI for bot opponents when matchmaking times out
- Queue management with 500-point range matching

**Advancements** (`lib/advancements/`):
- Achievement system with 13+ advancement types
- Local storage with Firestore sync
- Toast notifications on unlock
- Battle arena gating (certain advancements required)

**Version Selection** (`lib/version/`):
- Two UI versions: v1.0.0 (Discord UI) and v1.0.1 (Patreon UI)
- Version selector always shown on visit (no auto-restore from localStorage)
- Separate component trees per version in `components/home/v1.0.0/` and `v1.0.1/`

## Code Conventions

### Imports and Path Aliases

- Use `@/*` path alias for all imports from `src/`: `import { cn } from '@/lib/utils'`
- Use the `cn()` utility from `@/lib/utils` for combining Tailwind classes (clsx + tailwind-merge)

### Component Patterns

- **Feature-based organization**: Components are grouped by feature area, not by type
- **Client components**: Mark with `'use client'` directive when using hooks, event handlers, or browser APIs
- **CSS Modules**: Component-scoped styles use `.module.css` files alongside components
- **Radix UI**: Use Radix primitives for accessible UI components (shadcn/ui pattern)
- **Framer Motion**: Use for animations and page transitions

### Styling

- **Tailwind CSS** is the primary styling approach
- **Custom colors**: `azure-500` (#007FFF), `azure-600` (#0066CC) — use CSS variables for theme colors (`--background`, `--foreground`, `--border`, `--subtext`)
- **Dark mode**: Class-based strategy via `next-themes`, dark is the default theme
- **Custom fonts**: `font-pixel` (pixel font), `font-sans` (Inter), plus Geist (Sans and Mono) loaded as local fonts, Orbitron and Zen Kaku Gothic New via Google Fonts

### TypeScript

- Strict mode is enabled
- Target: ES2015
- Path alias: `@/*` → `./src/*`
- GLSL/WGSL shader files and WebGPU types are declared in `declarations.d.ts`
- Socket.IO events are fully typed in `src/types/game.ts`
- WebSocket multiplayer protocol typed in `src/types/multiplayer.ts`

### ESLint

- Extends `next/core-web-vitals` and `next/typescript`
- Run with `npm run lint`

## Environment Variables

The project uses multiple Firebase configurations for isolated feature backends. See `.env.example` for the full list. Key groups:

| Prefix | Purpose |
|--------|---------|
| `NEXT_PUBLIC_AZURE_SUPPORTER_*` | Discord community Firebase |
| `NEXT_PUBLIC_MNSW_*` | Voxel engine Firebase |
| `NEXT_PUBLIC_PORTFOLIO_*` | Portfolio Firebase |
| `NEXT_PUBLIC_RANKCARD_*` | Rank card Firebase |
| `NEXT_PUBLIC_RHYTHMIA_*` | Rhythmia game Firebase |
| `DISCORD_*` | Discord bot token, guild, roles, OAuth2 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-side Firebase Admin SDK |
| `NEXT_PUBLIC_MULTIPLAYER_URL` | WebSocket server URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID |

## Deployment

- **Vercel**: Main Next.js app deploys via git integration
- **Railway**: Multiplayer WebSocket server (`multiplayer-server.ts`) with Nixpacks builder (Node.js 20, Python 3, gcc, gnumake), health checks at `/health`, auto-restart on failure
- Configuration files: `railway.json`, `railway.multiplayer.json`, `nixpacks.toml`

## Webpack Customizations

Defined in `next.config.mjs` (wrapped with `next-intl` plugin):
- **GLSL loader**: `.glsl`, `.vs`, `.fs`, `.vert`, `.frag` files loaded as raw strings via `raw-loader`
- **Server externals**: `bufferutil`, `utf-8-validate`, `zlib-sync` externalized for discord.js server-side compatibility
- **Cache-Control**: All routes set to `no-cache, no-store, must-revalidate`
- **Turbopack**: Empty config included to silence build warnings

## Testing

No automated test framework is configured. Testing is done manually. See `TESTING.md` for manual test procedures (primarily for Discord role selection features).

## Key Patterns to Follow

1. **Feature isolation**: Keep feature logic in its own `lib/<feature>/` and `components/<feature>/` directories
2. **Type safety**: Define Socket.IO and WebSocket event types explicitly in `src/types/`
3. **Multiple Firebase projects**: Each feature has its own Firebase project — never cross-contaminate configurations
4. **Server vs client**: discord.js and Firebase Admin SDK are server-only — ensure they are not imported in client components
5. **Real-time state**: Game state flows through Socket.IO events (main server) or WebSocket messages (multiplayer server), not through React state directly
6. **Locale-aware routing**: All page routes go through `[locale]/` — use next-intl's `useTranslations` hook for strings, and the navigation helpers from `@/i18n/navigation` for links
7. **No automated tests**: When making changes, manually verify behavior. Consider adding tests if introducing complex logic
