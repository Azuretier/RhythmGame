# Azuret.me

様々なページあるので現在の用途を説明.
Explaining current situation below since there are several pages.

```cmd
azuret.net/: Interactive homepage with UI version selection (Discord-like or Patreon-style)
azuret.net/current: Storing my portfolio (currently in working) 現在制作中（わら）ポートフォリオだぅ
azuret.net/azure-supporter: my discord bot developing page with role selection 開発中discord botぺージ（
azuret.net/guilds/[guild_id]/rank-card/[display_name]: Discord rank card system with real-time Firebase data
azuret.net/play: Multiplayer Score Attack game with real-time WebSocket gameplay
```

## Features

### 1. Multiplayer Score Attack Game (`/play`)

A real-time multiplayer game where players compete to achieve the highest score within a time limit.

#### Key Features
- **Room System**: Create or join game rooms with shareable room codes
- **Real-time Multiplayer**: WebSocket-based communication via Socket.IO
- **Live Scoreboard**: Real-time score updates for all players
- **Synchronized Gameplay**: Countdown timer and synchronized game start
- **Anti-cheat**: Server-side score validation and rate limiting
- **Mobile-Friendly**: Responsive design works on all devices

#### How to Play
1. Visit `/play` and enter your player name
2. **Create Room**: Start a new game and share the 6-character room code with friends
3. **Join Room**: Enter a room code to join an existing game
4. **Lobby**: Wait for all players to join. Host can start the game when ready
5. **Gameplay**: Click/tap as fast as you can to score points (60 seconds)
6. **Leaderboard**: View final rankings and celebrate the winner!

#### Technical Details
- **Server**: Custom Next.js server with Socket.IO integration
- **Client**: React hooks for real-time game state management
- **Security**: Rate limiting (max 10 events/second), server-side score aggregation
- **State Management**: Room states (lobby → countdown → active → finished)

### 2. Interactive Homepage (`/`)

The homepage features a modern interactive experience with **user-selectable UI versions**:

#### UI Version Selection
- **v1.0.0 - Discord UI**: Discord-like messenger interface with intent-based social navigation
- **v1.0.1 - Patreon UI**: Patreon-style creator layout with profile card and content feed
- **First Visit**: Choose your preferred UI version after the loading screen
- **Persistent**: Your choice is saved and automatically loaded on return visits
- **Switchable**: Change versions anytime using the floating settings button

**Documentation**: See [VERSION_SELECTION_GUIDE.md](./VERSION_SELECTION_GUIDE.md) for details.

#### Common Features (All Versions)
- **GPU-Accelerated Background**: WebGL shader rendering with atmospheric effects, city silhouettes, and fog
- **Loading Screen**: Smooth animated loading experience with progress indicators
- **Modern Design**: Glassmorphism UI with gradients and animations

#### v1.0.0 - Discord UI
- **Discord-like Messenger UI**: Chat interface where you can interact with Azur
- **Intent Router**: Type messages to find social media links (X, YouTube, Discord, GitHub, Instagram)

**Customizing Social Links**: Edit `/src/lib/intent/parser.ts` to customize your social media links.

**Documentation**: See [HOMEPAGE_GUIDE.md](./HOMEPAGE_GUIDE.md) for detailed setup and customization instructions.

#### v1.0.1 - Patreon UI
- **Profile Card**: Avatar, bio, stats, and support button
- **Content Feed**: Recent posts with likes and engagement
- **Social Links**: Quick access to all social media platforms

### 2. Discord Rank Card System

Display real-time Discord rank cards for server members:

- **Real-time Updates**: Firebase Firestore integration for live data
- **Smart Matching**: Handles member lookup with normalization
- **Beautiful UI**: Glass-morphism design with gradients
- **Unique URLs**: Each member gets a persistent rank card URL

**URL Format**: `/guilds/[guild_id]/rank-card/[display_name]`

**Documentation**: See [RANK_CARD_SETUP.md](./RANK_CARD_SETUP.md) for setup instructions.

### 3. Discord Role Selection (`/azure-supporter`)

The `/azure-supporter` page allows users to select EN or JP roles which are synced to your Discord server.

### Prerequisites
1. A Discord bot with the following permissions:
   - Manage Roles
   - Read Messages/View Channels
2. Discord OAuth2 application credentials

### Setup Instructions

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your `.env` file with the values below**

### Environment Variables

Add the following to your `.env` file:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN='your_discord_bot_token'
DISCORD_GUILD_ID='your_discord_server_id'
DISCORD_ROLE_EN='your_en_role_id'
DISCORD_ROLE_JP='your_jp_role_id'

# Discord OAuth2 Configuration
DISCORD_CLIENT_ID='your_discord_client_id'
DISCORD_CLIENT_SECRET='your_discord_client_secret'
NEXT_PUBLIC_DISCORD_CLIENT_ID='your_discord_client_id'
NEXT_PUBLIC_DISCORD_REDIRECT_URI='http://localhost:3000/api/auth/discord/callback'
```

### Getting Discord IDs

#### Bot Token
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create or select your application
3. Go to "Bot" section
4. Copy the token (reset if needed)

#### OAuth2 Credentials
1. In the same application, go to "OAuth2" section
2. Copy the Client ID and Client Secret
3. Add `http://localhost:3000/api/auth/discord/callback` to redirects (or your production URL)

#### Server and Role IDs
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your server → Copy Server ID
3. Right-click each role → Copy Role ID

### Bot Permissions
Your bot needs these permissions in the Discord server:
- Manage Roles
- View Channels

**Important:** The bot's role must be positioned ABOVE the EN and JP roles in the role hierarchy.

### Installation and Development

```bash
# Install dependencies
npm install

# Run development server (with Socket.IO support)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The development and production servers now use a custom Next.js server with Socket.IO support for real-time multiplayer functionality.

**Available Routes:**
- `http://localhost:3000/` - Interactive homepage
- `http://localhost:3000/play` - Multiplayer Score Attack game
- `http://localhost:3000/azure-supporter` - Discord role selection
- `http://localhost:3000/current` - Portfolio page

### Deployment Notes

When deploying to production:

1. **Socket.IO Configuration**: The custom server (`server.ts`) is required for multiplayer functionality
2. **Port Configuration**: Set `PORT` environment variable for custom port (default: 3000)
3. **Node.js Runtime**: Ensure your hosting platform supports Node.js custom servers
4. **WebSocket Support**: Verify your hosting platform supports WebSocket connections

**Deployment Platforms:**
- ✅ **Railway**: **Recommended** - One-click deploy, 24/7 uptime, WebSocket support ([See detailed guide](./RAILWAY_DEPLOYMENT.md))
- ✅ **VPS/Dedicated Server**: Fully supported (run with `npm start`)
- ✅ **Heroku**: Supported with custom server
- ✅ **AWS/Azure/GCP**: Supported with containerization or Node.js runtime
- ⚠️ **Vercel**: Multiplayer features require serverless WebSocket alternative

**📖 Railway 24/7 Deployment Guide**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for complete Railway deployment instructions.

### Project Structure

```
/src
  /app
    /play              # Multiplayer game page
    /api               # API routes
  /components
    /game              # Game UI components
  /hooks
    /useGameSocket.ts  # Socket.IO client hook
  /lib
    /game              # Game logic and state management
  /types
    /game.ts           # TypeScript type definitions
/server.ts             # Custom Next.js + Socket.IO server
```

