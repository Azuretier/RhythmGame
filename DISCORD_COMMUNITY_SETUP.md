# Discord Community Integration

This document explains the Discord bot and community features integrated into Azuret.me.

## Overview

The Discord Community platform includes:
- **Discord Bot** - XP tracking, leveling, role management
- **Web Profile Pages** - User profiles accessible at `/azure-community/[userId]`
- **Firestore Backend** - Unified data layer for bot and web app

## Architecture

### Data Layer: Firestore

All user data is stored in Google Cloud Firestore with the following collections:

#### `discord-users/{userId}`
User profile data:
```typescript
{
  id: string              // Discord user ID
  username: string        // Discord username
  avatarUrl: string       // Avatar image URL
  xp: number             // Total experience points
  level: number          // Calculated level
  rank: string           // Rank tier (accordian, arcadia, apex, legendary)
  rulesAgreed: boolean   // Whether user agreed to server rules
  roles: string[]        // Custom role IDs
  joinedAt: string       // ISO timestamp of when user joined
  lastXpGain?: string    // ISO timestamp of last XP gain
  messageCount?: number  // Total messages sent
}
```

#### `discord-xp-cooldowns/{userId}`
XP gain cooldowns (60 seconds between XP gains):
```typescript
{
  userId: string
  lastXpGain: string    // ISO timestamp
  expiresAt: string     // ISO timestamp
}
```

#### `discord-rule-progress/{userId}`
User progress through rule learning (web app only):
```typescript
{
  userId: string
  progress: RuleProgress[]
  totalPoints: number
  currentRuleIndex: number
  updatedAt: string
}
```

#### `discord-guild-configs/{guildId}`
Guild-specific configuration:
```typescript
{
  guildId: string
  preMemberRoleId?: string
  memberRoleId?: string
  xpPerMessage: number
  xpCooldownSeconds: number
  levelUpChannelId?: string
  rulesChannelId?: string
}
```

### XP & Leveling System

- **XP Gain**: Users earn 10 XP per message (with 60-second cooldown)
- **Level Calculation**: `level = floor(sqrt(xp / 100))`
- **Rank Tiers**:
  - Accordian: Level 0-14
  - Arcadia: Level 15-29
  - Apex: Level 30-49
  - Legendary: Level 50+

## Discord Bot Setup

### Prerequisites

1. Create a Discord bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
3. Invite bot with these permissions:
   - Manage Roles
   - Send Messages
   - Read Message History
   - Use Slash Commands

### Environment Variables

Add these to your `.env` file:

```bash
# Discord Bot
DISCORD_BOT_TOKEN='your_bot_token_here'
DISCORD_GUILD_ID='your_guild_id_here'

# Firebase Admin (for bot)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Firebase Client (for web app)
NEXT_PUBLIC_DISCORD_FIREBASE_API_KEY='your_api_key'
NEXT_PUBLIC_DISCORD_FIREBASE_AUTH_DOMAIN='your_project.firebaseapp.com'
NEXT_PUBLIC_DISCORD_FIREBASE_PROJECT_ID='your_project_id'
NEXT_PUBLIC_DISCORD_FIREBASE_STORAGE_BUCKET='your_project.appspot.com'
NEXT_PUBLIC_DISCORD_FIREBASE_MESSAGING_SENDER_ID='your_sender_id'
NEXT_PUBLIC_DISCORD_FIREBASE_APP_ID='your_app_id'
```

### Installation

```bash
# Install bot dependencies
npm run bot:install

# Deploy slash commands to Discord
npm run bot:deploy-commands
```

### Running the Bot

```bash
# Development mode (with hot reload)
npm run bot:dev

# Production mode
npm run bot:build
npm run bot:start
```

## Web App Integration

### Profile Route

User profiles are accessible at: `/azure-community/[userId]`

Example: `https://azuret.me/azure-community/123456789012345678`

### Features

- Real-time profile display
- XP progress bars
- Rank badges and colors
- Custom roles display
- Level and stats

### Code Splitting

The Discord community page is dynamically imported to avoid shipping code to unrelated pages.

## Bot Commands

### `/profile [@user]`
View a user's profile card with stats, level, and XP.

### `/leaderboard`
Display top 10 users by XP.

### `/rules`
View server rules and agree to them. Removes "Pre-Member" role and grants "Member" role.

### `/roles`
Get a link to customize your roles on the web app.

### `/reconnect` (Admin)
Re-register bot commands and refresh event handlers.

## Bot Events

### New Member Join
- Auto-assigns "Pre-Member" role
- Sends welcome message with `/rules` prompt

### Message Create
- Awards XP (with 60-second cooldown)
- Announces level ups
- Announces rank changes

### Button Interactions
- Handles rules agreement button
- Updates profile and assigns roles

## Firestore Security Rules

Recommended Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for user profiles
    match /discord-users/{userId} {
      allow read: if true;
      allow write: if false; // Only bot can write via admin SDK
    }
    
    // Private XP cooldowns (bot only)
    match /discord-xp-cooldowns/{userId} {
      allow read, write: if false;
    }
    
    // Private rule progress (user's own only)
    match /discord-rule-progress/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Private guild configs (bot only)
    match /discord-guild-configs/{guildId} {
      allow read, write: if false;
    }
  }
}
```

## Deployment

### Bot Deployment (Railway)

1. Create a new project on Railway
2. Connect your GitHub repository
3. Set root directory to `apps/discord-bot`
4. Add environment variables
5. Set start command: `npm run start`
6. Deploy!

### Web App Deployment (Vercel)

The web app automatically deploys via Vercel with the existing configuration. Just ensure Firebase environment variables are set.

## Troubleshooting

### Bot not responding to commands
- Run `/reconnect` command as an admin
- Check bot has proper permissions
- Verify `DISCORD_GUILD_ID` is correct

### Profile not found
- User must send at least one message in Discord server
- Check Firebase environment variables are correct
- Verify Firestore has the user document

### XP not updating
- Check 60-second cooldown hasn't been triggered
- Verify Firestore write permissions for admin SDK
- Check bot has Message Content Intent enabled

## Development

### File Structure

```
/apps/discord-bot/           - Discord bot application
  /src/
    /commands/              - Slash commands
    /events/                - Discord event handlers
    /services/              - Firestore and business logic
    /utils/                 - Helper utilities
    index.ts                - Bot entry point

/src/lib/discord-community/  - Shared code
  types.ts                  - Shared TypeScript types
  firestore-client.ts       - Web app Firestore service
  
/apps/discord-bot/src/services/
  firestore.service.ts      - Bot Firestore admin service

/src/app/azure-community/[userId]/
  page.tsx                  - User profile page
```

### Adding New Features

1. Update shared types in `/src/lib/discord-community/types.ts`
2. Update Firestore services (client and admin)
3. Add bot command or event handler
4. Update web UI as needed

## Migration Notes

This integration replaces the previous Spark KV store with Firestore. Key changes:

- **Data Storage**: Spark KV → Firestore collections
- **Bot Access**: HTTP API → Firebase Admin SDK
- **Web Access**: useKV hook → Firestore client SDK
- **Real-time**: localStorage → Cloud-synced Firestore

All existing functionality is preserved with improved reliability and scalability.
