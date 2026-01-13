# azuret.net
様々なページあるので現在の用途を説明.
Explaining current situation below since there are several pages.
```cmd
azuret.net/current: Storing my portfolio (currently in working) 現在制作中（わら）ポートフォリオだぅ
azuret.net/azure-supporter: my discord bot developing page with role selection 開発中discord botぺージ（
```

## Discord Role Selection Setup

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

## Rank Card Feature

The rank card feature allows viewing member rank information in real-time with Unicode display name support.

### Setup

1. **Configure Firebase Admin SDK** (required for server-side Firestore writes):
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Copy the entire JSON content
   - Add it to your `.env` file as `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line string)

2. **Firestore Data Structure**:
   - Members collection: `guilds/{guildId}/members`
   - Members should have: `displayName`, `displayNameKey` (lowercase NFKC), `xp`, `level`, `rankName`, `avatarUrl` (or `avaterUrl`)
   - Rank cards collection: `guilds/{guildId}/rankCards` (auto-generated)

### Usage

Visit: `/guilds/{guild_id}/rank-card/{user_discord_display_name}`

The page will:
- Decode and normalize Unicode display names
- Query Firestore for matching members
- Subscribe to real-time updates via `onSnapshot`
- Display a modern glass-morphic rank card with XP progress

