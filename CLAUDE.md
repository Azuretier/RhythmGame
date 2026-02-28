# CLAUDE.md - AI Assistant Guide for azuretier.net

## Project Overview

**azuretier.net** (package name: `azuret.net`) is a full-stack gaming platform built with Next.js 16 and TypeScript. It features multiplayer rhythm/battle games (Rhythmia) with ranked matchmaking, a 9-player arena mode, a Minecraft-style board game, an advancements (achievements) system, loyalty rewards, profile customization with skin theming, interactive stories, a wiki, and WebGL/Three.js visual effects. The site is internationalized with next-intl, supporting Japanese (default), English, Thai, Spanish, and French locales.

## Tech Stack

- **Framework**: Next.js 16.1.5 (App Router) with React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4 + CSS Modules + Framer Motion 11
- **UI Components**: Radix UI primitives (shadcn/ui pattern), Phosphor Icons, Lucide React
- **3D/Graphics**: Three.js 0.179 (`@react-three/fiber` + `@react-three/drei`), WebGL shaders (GLSL), WebGPU (experimental)
- **Real-time**: Socket.IO 4.8 + raw WebSocket (`ws`)
- **Database**: Firebase 12 (Firestore) + Firebase Admin 13 — multiple projects for different features
- **AI**: Google Generative AI (`@google/generative-ai`) — powers the For You tab recommendations
- **Internationalization**: next-intl 4.8 (ja/en/th/es/fr locales, `as-needed` prefix strategy)
- **Analytics**: Google Analytics via `@next/third-parties` + Vercel Analytics (`@vercel/analytics`)
- **Deployment**: Vercel (main app) + Railway (multiplayer WebSocket server)

## Commands

```bash
npm run dev          # Start dev server with Socket.IO (localhost:3000)
npm run build        # Next.js production build + next-sitemap (postbuild)
npm run start        # Production server with Socket.IO
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run multiplayer  # Start standalone WebSocket multiplayer server (port 3001)
```

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── layout.tsx          # Minimal root layout (delegates to [locale])
│   ├── provider.tsx        # Client providers (AnimatePresence → ThemeProvider → NotificationProvider)
│   ├── data.ts             # App-level data configuration
│   ├── globals.css         # Global styles
│   ├── [locale]/           # Locale-based routing (next-intl)
│   │   ├── layout.tsx      # Main layout (providers, SEO metadata, JSON-LD, Google Analytics)
│   │   ├── page.tsx        # Home page (version-switched: discord-messenger/creator-portfolio/minecraft-panorama/RhythmiaLobby)
│   │   ├── arena/          # Arena game mode route
│   │   ├── chapter/        # Story chapter route
│   │   ├── loyalty/        # Loyalty dashboard route
│   │   ├── minecraft-board/# Minecraft board game route
│   │   ├── stories/        # Stories viewer route
│   │   ├── updates/        # Updates/changelog route
│   │   └── wiki/           # Wiki route
│   ├── api/                # API routes
│   │   ├── for-you/        # Gemini AI-powered content recommendations
│   │   └── site-entry/     # Discord webhook for new player profile notifications
│   ├── blog/               # Blog route
│   ├── shader-demo/        # WebGL shader demo route
│   ├── social-widgets/     # Social media widgets route
│   ├── webgpu-demo/        # WebGPU heartbeat demo route
│   └── fonts/              # Local font files (Geist Sans + Mono)
├── components/             # React components organized by feature
│   ├── home/               # Homepage components
│   │   ├── discord-messenger/ # Discord UI variant
│   │   ├── creator-portfolio/ # Patreon UI variant
│   │   ├── minecraft-panorama/ # Minecraft panorama variant
│   │   ├── pixel-art/      # Pixel art UI variant
│   │   ├── InteractiveHomepage.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── MessengerUI.tsx
│   │   ├── ResponseCard.tsx
│   │   └── WebGLBackground.tsx
│   ├── rhythmia/           # Rhythm game — main game, tetris engine, multiplayer, ranked
│   │   ├── tetris/         # Core tetris engine (Board, pieces, hooks, transitions)
│   │   ├── chapter-player/ # Story chapter playback in rhythm game
│   │   ├── VanillaGame.tsx, MultiplayerBattle.tsx, RankedMatch.tsx, MobBattle.tsx
│   │   ├── MultiplayerGame.tsx, RhythmiaLobby.tsx, Rhythmia.tsx
│   │   ├── ForYouTab.tsx, Advancements.tsx, LifeJourney.tsx
│   │   ├── ForestCampfireScene.tsx, VoxelWorldBackground.tsx, WebGPUStage.tsx
│   │   └── Heartbeat.tsx, ParticleSystem.tsx, PixelIcon.tsx
│   ├── arena/              # 9-player arena game (ArenaGame.tsx)
│   ├── minecraft-board/    # Minecraft board game (MinecraftBoardGame, BoardRenderer, CraftingPanel, PlayerHUD)
│   ├── multiplayer-lobby/  # Multiplayer game UI (lobby, leaderboard, room creation)
│   ├── floating-particles/ # Floating particle effects
│   ├── portfolio/          # Portfolio display (WindowFrame, ModelViewer)
│   ├── rank-card/          # Discord rank card components
│   ├── blog/               # Blog components (navbar, profile, post-card)
│   ├── minecraft-switch/   # Voxel engine UI (panorama background)
│   ├── social-widgets/     # Social widgets (Discord, GitHub, YouTube, Twitter, Instagram)
│   ├── version/            # Version selector UI (VersionSelector, FloatingVersionSwitcher)
│   ├── loyalty/            # Loyalty system (LoyaltyDashboard, LoyaltyWidget)
│   ├── profile/            # Player profile (ProfileSetup, SkinCustomizer, ThemeSwitcher, OnlineUsers)
│   ├── stories/            # Story viewer (StoryViewer)
│   ├── wiki/               # Wiki page (WikiPage)
│   ├── shared-ui/          # Shared UI (NotificationCenter, UpdatesPage, UpdatesPanel, WhatsNewBanner, animations)
│   ├── LocaleSwitcher.tsx  # Language switcher component
│   └── ModelViewer.tsx     # 3D model viewer
├── data/                   # Static data files
│   ├── chapters/           # Story chapter data
│   └── stories/            # Story content data
├── lib/                    # Business logic and utilities
│   ├── socket-rooms/       # GameManager (Socket.IO room/player management)
│   ├── multiplayer/        # RoomManager + FirestoreRoomService (WebSocket rooms)
│   ├── ranked/             # Ranked matchmaking (TetrisAI, tiers, queue management)
│   ├── arena/              # ArenaManager (9-player arena room logic)
│   ├── minecraft-board/    # MinecraftBoardManager, recipes, world generation
│   ├── mob-battle/         # Mob battle constants and types
│   ├── advancements/       # Achievements system (definitions, Firestore sync, local storage)
│   ├── loyalty/            # Loyalty rewards (constants, Firestore, storage, types)
│   ├── profile/            # Player profile context, storage, and types
│   ├── skin/               # Skin customization context, storage, and types
│   ├── theme/              # UI theme context, storage, and types
│   ├── google-sync/        # Google account sync (context, Firestore, service)
│   ├── notifications/      # Notification context provider and types
│   ├── discord-community/  # Discord OAuth2, role management, rank-card-service
│   ├── discord-bot/        # Discord bot client and notifications
│   ├── rank-card/          # Rank card generation (firebase, firebase-admin, utils)
│   ├── rhythmia/           # Game-specific logic (firebase)
│   ├── portfolio/          # Portfolio data (firebase)
│   ├── minecraft-switch/   # Voxel engine (TextureUtils, VoxelEngine, firebase)
│   ├── firebase/           # Shared Firebase utilities (initAppCheck)
│   ├── updates/            # Changelog data and update entries
│   ├── version/            # Version selection context, types, storage persistence
│   ├── intent/             # Intent parser for command interpretation
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── hooks/                  # Custom React hooks
│   ├── useGameSocket.ts    # Socket.IO connection hook
│   ├── useArenaSocket.ts   # Arena WebSocket connection hook
│   ├── useMinecraftBoardSocket.ts  # Minecraft board WebSocket hook
│   ├── useEchoesSocket.ts # Echoes of Eternity WebSocket hook
│   ├── useSlideScroll.ts   # Slide-based scroll navigation
│   ├── useIsMobile.ts      # Mobile detection
│   ├── useKeyValue.ts      # Key-value localStorage persistence
│   └── useLocalStorage.ts  # Local storage persistence
├── i18n/                   # Internationalization configuration
│   ├── routing.ts          # Locale routing (ja default, en/th/es/fr secondary, as-needed prefix)
│   ├── request.ts          # next-intl server request config
│   └── navigation.ts       # Locale-aware navigation helpers
├── types/                  # TypeScript type definitions
│   ├── game.ts             # Socket.IO event types (Player, Room, GAME_CONFIG)
│   ├── multiplayer.ts      # WebSocket protocol types (ClientMessage, ServerMessage)
│   ├── arena.ts            # Arena types (ArenaPlayer, ArenaRoomState, gimmicks, chaos system)
│   ├── minecraft-board.ts  # Minecraft board types (blocks, items, mobs, world, crafting)
│   └── community.ts        # Discord community types (RuleProgress)
├── styles/                 # Global and module CSS
│   ├── Home.module.css
│   ├── minecraft-switch/   # Minecraft Switch Edition styles
│   └── blog/               # Blog-specific styles
└── middleware.ts           # next-intl middleware for locale detection/routing

# Root-level files
server.ts                   # Custom Next.js + Socket.IO server
multiplayer-server.ts       # Standalone WebSocket server (1v1, ranked, arena, minecraft-board)
messages/                   # i18n translation files (ja.json, en.json, th.json, es.json, fr.json)
declarations.d.ts           # Type declarations (GLSL, WGSL, WebGPU, Spark SDK)
rhythmia.config.json        # Game version configuration
for-you.config.json         # For You tab content configuration
```

### Server Architecture

The project runs two separate servers:

1. **Main server** (`server.ts`): Custom Node HTTP server wrapping Next.js with Socket.IO for game room management (create/join/leave rooms, score events, reconnection). Port 3000.
2. **Multiplayer server** (`multiplayer-server.ts`): Standalone WebSocket server for lower-latency room-based multiplayer with tick-based game state (10 ticks/second). Handles multiple game modes: 1v1 battles, ranked matchmaking (8s timeout with AI fallback), 9-player arena (with chaos/gimmick system), and Minecraft board game. Includes reconnect tokens and heartbeat keepalive (15s interval). Port 3001.

### Provider Hierarchy

```
<html lang={locale}>                          ← Dynamic locale from next-intl
  <NextIntlClientProvider messages={messages}> ← i18n translations
    <UiThemeProvider>                          ← UI theme context (visual theme customization)
      <GoogleSyncProvider>                     ← Google account sync context
        <ProfileProvider>                      ← Player profile context
          <SkinProvider>                       ← Skin customization context
            <VersionProvider>                  ← UI version selection context
              <AnimatePresence>                ← Framer Motion page transitions
                <ThemeProvider>                ← next-themes (dark mode default, class strategy)
                  <NotificationProvider>       ← In-app notification context
                    {children}
                  </NotificationProvider>
                </ThemeProvider>
              </AnimatePresence>
            </VersionProvider>
          </SkinProvider>
        </ProfileProvider>
      </GoogleSyncProvider>
    </UiThemeProvider>
  </NextIntlClientProvider>
</html>
```

### Internationalization (next-intl)

- **Locales**: `ja` (default, no URL prefix), `en`, `th`, `es`, `fr` (prefixed)
- **Strategy**: `as-needed` — Japanese pages have no locale prefix, other locales are prefixed
- **Messages**: JSON files in `messages/` directory (`ja.json`, `en.json`, `th.json`, `es.json`, `fr.json`)
- **Middleware**: `src/middleware.ts` handles locale detection and routing
- **Routing config**: `src/i18n/routing.ts` defines supported locales and prefix strategy
- **SEO**: `[locale]/layout.tsx` generates localized metadata with `hreflang` alternates and JSON-LD structured data

### Key Feature Systems

**Rhythmia Game Engine** (`components/rhythmia/`):
- Standalone tetris engine with hooks (useGameState, useAudio, useRhythmVFX)
- Multiple game modes: Vanilla, Multiplayer Battle, Ranked Match, Mob Battle
- Visual variants: WebGPU stage, forest campfire scene, voxel world background
- Chapter player for story-driven rhythm gameplay
- For You tab with Gemini AI-powered recommendations
- Advancements, life journey tracking, pixel icons

**Arena Mode** (`components/arena/` + `lib/arena/` + `types/arena.ts`):
- 9-player simultaneous multiplayer arena
- Shared tempo with synchronized music and beat phases
- Chaos system with gimmicks (tempo shift, gravity surge, mirror mode, garbage rain, blackout, speed frenzy, freeze frame, shuffle preview)
- Targeting system (random, leader, nearest, manual) and power-ups
- Emote system for player communication

**Minecraft Board Game** (`components/minecraft-board/` + `lib/minecraft-board/` + `types/minecraft-board.ts`):
- Multiplayer board game with Minecraft-inspired mechanics
- World generation with biomes, blocks, mobs, and day/night cycle
- Crafting system with recipes, inventory management
- Mining, combat, tool tiers (hand → wood → stone → iron → diamond)
- Board renderer with fog-of-war and viewport system

**Ranked Matchmaking** (`lib/ranked/`):
- Tier-based ranking system with points, divisions, bus fares, and win rewards
- TetrisAI for bot opponents when matchmaking times out
- Queue management with 500-point range matching

**Advancements** (`lib/advancements/`):
- Achievement system with advancement types
- Local storage with Firestore sync
- Toast notifications on unlock
- Battle arena gating (certain advancements required)

**Loyalty System** (`lib/loyalty/` + `components/loyalty/`):
- Loyalty points and rewards tracking
- Dashboard and widget components
- Firestore persistence with local storage fallback

**Profile & Customization** (`lib/profile/` + `lib/skin/` + `lib/theme/`):
- Player profile setup with persistent storage
- Skin customization system with context-based state
- UI theme switching (visual theme customization)
- Google account sync for cross-device persistence

**Stories & Wiki** (`components/stories/` + `components/wiki/` + `data/`):
- Interactive story viewer with chapter-based content
- Wiki page system for game documentation
- Static story/chapter data in `src/data/`

**Version Selection** (`lib/version/`):
- Three UI versions: v1.0.0 (Discord UI), v1.0.1 (Patreon UI), v1.0.2 (Minecraft panorama)
- Plus "current" version (RhythmiaLobby — the main game experience)
- Version selector with FloatingVersionSwitcher component

**Updates System** (`lib/updates/` + `components/shared-ui/`):
- Changelog data with update entries
- UpdatesPage, UpdatesPanel, and WhatsNewBanner components
- Notification center for in-app updates

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
- **Theme system**: Theme-aware font families (`font-theme-heading`, `font-theme-body`, `font-theme-mono`) and border radii (`rounded-theme`, `rounded-theme-sm`, `rounded-theme-lg`) via CSS variables
- **Dark mode**: Class-based strategy via `next-themes`, dark is the default theme
- **Custom fonts**: `font-pixel` (pixel font), `font-sans` (Inter), plus Geist (Sans and Mono) loaded as local fonts, Orbitron and Zen Kaku Gothic New via Google Fonts

### TypeScript

- Strict mode is enabled
- Target: ES2015
- Path alias: `@/*` → `./src/*`
- GLSL/WGSL shader files and WebGPU types are declared in `declarations.d.ts`
- Socket.IO events are fully typed in `src/types/game.ts`
- WebSocket multiplayer protocol typed in `src/types/multiplayer.ts`
- Arena protocol typed in `src/types/arena.ts`
- Minecraft board game types in `src/types/minecraft-board.ts`

### ESLint

- Extends `next/core-web-vitals` and `next/typescript`
- Run with `npm run lint`

## Environment Variables

The project uses multiple Firebase configurations for isolated feature backends. See `.env.example` for the full list. Key groups:

| Prefix / Key | Purpose |
|--------------|---------|
| `NEXT_PUBLIC_AZURE_SUPPORTER_*` | Discord community Firebase |
| `NEXT_PUBLIC_MNSW_*` | Minecraft Switch Edition voxel engine Firebase |
| `NEXT_PUBLIC_PORTFOLIO_*` | Portfolio Firebase |
| `NEXT_PUBLIC_RANKCARD_*` | Rank card Firebase |
| `NEXT_PUBLIC_RHYTHMIA_*` | Rhythmia game Firebase |
| `DISCORD_*` | Discord bot token, guild, roles, OAuth2, webhooks |
| `DISCORD_ONLINE_WEBHOOK_URLS` | Discord webhooks for player online notifications |
| `DISCORD_SITE_ENTRY_WEBHOOK_URL` | Discord webhook for new player profile events |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-side Firebase Admin SDK |
| `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` | Firebase App Check (ReCaptcha v3) |
| `NEXT_PUBLIC_MULTIPLAYER_URL` | WebSocket server URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID |
| `GEMINI_API_KEY` | Google Generative AI key (For You tab) |
| `NEXT_PUBLIC_THIRD_WIDGET_TITLE` | Homepage widget title configuration |

## Deployment

- **Vercel**: Main Next.js app deploys via git integration, includes Vercel Analytics
- **Railway**: Multiplayer WebSocket server (`multiplayer-server.ts`) with Nixpacks builder (Node.js 20, Python 3, gcc, gnumake), health checks at `/health`, auto-restart on failure
- Configuration files: `railway.json`, `railway.multiplayer.json`, `nixpacks.toml`

## Webpack Customizations

Defined in `next.config.mjs` (wrapped with `next-intl` plugin):
- **GLSL loader**: `.glsl`, `.vs`, `.fs`, `.vert`, `.frag` files loaded as raw strings via `raw-loader`
- **Server externals**: `bufferutil`, `utf-8-validate`, `zlib-sync` externalized for discord.js server-side compatibility
- **Cache-Control**: All routes set to `no-cache, no-store, must-revalidate`
- **Turbopack**: Empty config included to silence build warnings

## Testing

No automated test framework is configured. Testing is done manually.

## Key Patterns to Follow

1. **Feature isolation**: Keep feature logic in its own `lib/<feature>/` and `components/<feature>/` directories
2. **Type safety**: Define Socket.IO and WebSocket event types explicitly in `src/types/`
3. **Multiple Firebase projects**: Each feature has its own Firebase project — never cross-contaminate configurations
4. **Server vs client**: discord.js and Firebase Admin SDK are server-only — ensure they are not imported in client components
5. **Real-time state**: Game state flows through Socket.IO events (main server) or WebSocket messages (multiplayer server), not through React state directly
6. **Locale-aware routing**: All page routes go through `[locale]/` — use next-intl's `useTranslations` hook for strings, and the navigation helpers from `@/i18n/navigation` for links
7. **Context-based state**: Feature state (profile, skin, theme, version, google-sync) uses React Context with local storage persistence
8. **No automated tests**: When making changes, manually verify behavior. Consider adding tests if introducing complex logic
