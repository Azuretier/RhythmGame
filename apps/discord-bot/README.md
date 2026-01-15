# Azure Community Discord Bot

Discord bot for the Azure Community with XP tracking, leveling system, role management, and Firestore integration.

## Features

- **XP & Leveling System** - Users gain XP from messages, level up, and progress through rank tiers
- **Rules System** - New members agree to rules to gain access
- **Role Management** - Custom roles synced between Discord and web app
- **Profile Cards** - Rich embeds showing user stats and progress
- **Leaderboard** - Top users by XP
- **Firestore Integration** - Real-time data sync with web app

## Prerequisites

1. Node.js 18+ installed
2. A Discord bot created at [Discord Developer Portal](https://discord.com/developers/applications)
3. Firebase project with Firestore enabled
4. Firebase Admin SDK service account JSON

## Setup

### 1. Discord Bot Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent

### 2. Invite Bot to Server

Generate an invite URL with these permissions:
- Manage Roles
- Send Messages
- Read Message History
- Use Slash Commands
- View Channels

Scopes needed: `bot` and `applications.commands`

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file securely

### 4. Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables:
- `DISCORD_BOT_TOKEN` - Your bot token from Discord Developer Portal
- `DISCORD_GUILD_ID` - Your Discord server ID (enable Developer Mode, right-click server, Copy Server ID)
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Firebase service account JSON (as single-line string)
- `WEBAPP_URL` - Your web app URL (default: https://azuret.me)

### 5. Install Dependencies

```bash
npm install
```

### 6. Deploy Slash Commands

Before running the bot, deploy slash commands to Discord:

```bash
npm run deploy-commands
```

## Running the Bot

### Development Mode (with hot reload)

```bash
npm run dev
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Start the bot
npm start
```

## Commands

### `/profile [@user]`
View a user's profile card with stats, level, rank, and XP progress.

**Usage:**
- `/profile` - View your own profile
- `/profile @username` - View another user's profile

### `/leaderboard`
Display the top 10 users by total XP.

### `/rules`
View and agree to server rules. Clicking "I Agree" removes the "Pre-Member" role and grants the "Member" role.

### `/roles`
Get a link to customize your roles on the web app.

### `/reconnect` (Admin only)
Re-register bot commands and refresh event handlers. Useful after bot updates.

## How It Works

### XP System

- **Gain XP**: Users earn 10 XP per message
- **Cooldown**: 60 seconds between XP gains (prevents spam)
- **Level Calculation**: `level = floor(sqrt(xp / 100))`
- **Rank Tiers**:
  - Accordian: Level 0-14
  - Arcadia: Level 15-29
  - Apex: Level 30-49
  - Legendary: Level 50+

### New Member Flow

1. User joins Discord server
2. Bot automatically assigns "Pre-Member" role
3. Bot sends welcome message with `/rules` command
4. User runs `/rules` and clicks "I Agree"
5. Bot removes "Pre-Member" role and assigns "Member" role
6. User gains full server access

### Data Storage

All data is stored in Firestore with these collections:

- `discord-users/{userId}` - User profiles with XP, level, rank
- `discord-xp-cooldowns/{userId}` - XP gain cooldowns
- `discord-rule-progress/{userId}` - Rule learning progress
- `discord-guild-configs/{guildId}` - Guild configuration

## Deployment

### Railway (Recommended)

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set root directory to `apps/discord-bot`
4. Add environment variables in Railway dashboard
5. Railway will automatically build and deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t azure-discord-bot .
docker run -d --env-file .env azure-discord-bot
```

### VPS/Dedicated Server

```bash
# Clone repo
git clone https://github.com/Azuretier/Azuret.me.git
cd Azuret.me/apps/discord-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your values

# Build and start
npm run build
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start dist/index.js --name azure-bot
pm2 save
pm2 startup
```

## Troubleshooting

### Bot not responding to commands

1. Verify bot is online in Discord
2. Check bot has proper permissions
3. Run `/reconnect` command as an admin
4. Check `DISCORD_GUILD_ID` matches your server
5. Verify slash commands were deployed

### Profile not found errors

- User must send at least one message for profile to be created
- Check Firestore connection and permissions
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is correct

### XP not updating

- Check 60-second cooldown hasn't been triggered
- Verify Firestore write permissions
- Ensure bot has Message Content Intent enabled

### Level up messages not sending

- Check bot has Send Messages permission
- Verify channel isn't read-only
- Check bot role is high enough in hierarchy

## Development

### Project Structure

```
src/
├── commands/          # Slash commands
│   ├── profile.ts
│   ├── leaderboard.ts
│   ├── rules.ts
│   ├── roles.ts
│   └── reconnect.ts
├── events/            # Discord event handlers
│   ├── ready.ts
│   ├── messageCreate.ts
│   ├── guildMemberAdd.ts
│   └── interactionCreate.ts
├── services/          # Business logic
│   ├── firestore.service.ts
│   ├── xp.service.ts
│   └── role.service.ts
├── types/             # TypeScript types
│   ├── index.ts
│   └── discord-community.ts
├── utils/             # Helper functions
│   ├── logger.ts
│   └── xp.ts
├── index.ts           # Bot entry point
└── deploy-commands.ts # Command deployment script
```

### Adding New Commands

1. Create a new file in `src/commands/`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. The command will be auto-registered on bot startup

Example:
```typescript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mycommand')
  .setDescription('My new command');

export async function execute(interaction) {
  await interaction.reply('Hello!');
}
```

### Adding Event Handlers

1. Create a new file in `src/events/`
2. Export `name` (event name) and `execute` function

Example:
```typescript
import { Events } from 'discord.js';

export default {
  name: Events.MessageDelete,
  async execute(message) {
    console.log('Message deleted:', message.content);
  }
};
```

## Support

For issues or questions:
1. Check [DISCORD_COMMUNITY_SETUP.md](../../DISCORD_COMMUNITY_SETUP.md) in the root
2. Review Firestore security rules
3. Check bot permissions in Discord
4. Verify environment variables

## License

MIT
