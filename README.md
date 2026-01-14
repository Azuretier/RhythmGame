# Azuret.me

様々なページあるので現在の用途を説明.
Explaining current situation below since there are several pages.

```cmd
azuret.net/: Interactive homepage with Discord-like messenger UI and GPU-rendered background
azuret.net/current: Storing my portfolio (currently in working) 現在制作中（わら）ポートフォリオだぅ
azuret.net/azure-supporter: my discord bot developing page with role selection 開発中discord botぺージ（
azuret.net/guilds/[guild_id]/rank-card/[display_name]: Discord rank card system with real-time Firebase data
```

## Version Selection

When you first visit the homepage, you'll be presented with a version selector after the loading screen. You can choose between:

- **v1.0.0 - Discord-like UI**: Interactive homepage with Discord-like messenger UI and GPU-rendered background
- **v1.0.1 - Patreon User UI**: Portfolio interface with advanced window management and customizable themes

Your selection is saved in localStorage and will be remembered for future visits. You can change your selected version at any time:

- On the **Discord-like UI** (v1.0.0): Click the floating settings button in the bottom-right corner
- On the **Patreon User UI** (v1.0.1): Open the Settings window and use the Version Selection section

## Features

### 1. Interactive Homepage (`/`)

The homepage features a modern interactive experience with:

- **GPU-Accelerated Background**: WebGL shader rendering with atmospheric effects, city silhouettes, and fog
- **Loading Screen**: Smooth animated loading experience with progress indicators
- **Discord-like Messenger UI**: Chat interface where you can interact with Azur
- **Intent Router**: Type messages to find social media links (X, YouTube, Discord, GitHub, Instagram)

**Customizing Social Links**: Edit `/src/lib/intent/parser.ts` to customize your social media links.

**Documentation**: See [HOMEPAGE_GUIDE.md](./HOMEPAGE_GUIDE.md) for detailed setup and customization instructions.

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

### Installation

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/azure-supporter` to use the role selection feature.

