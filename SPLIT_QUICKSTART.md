# Quick Start: Splitting into Two Projects

## What We're Doing

Splitting this monolithic application into:
1. **Azuret.me** - Personal website (keep this repo)
2. **Discord Bot Dashboard** - Discord features (new repo)

## Step-by-Step Instructions

### Step 1: Create New Repository for Discord Bot

1. Go to GitHub and create new repository: `Discord-Bot-Dashboard`
2. Clone it locally:
   ```bash
   git clone https://github.com/Azuretier/Discord-Bot-Dashboard.git
   cd Discord-Bot-Dashboard
   ```

3. Initialize Next.js:
   ```bash
   npx create-next-app@14.2.35 . --typescript --tailwind --app
   ```

4. Copy Discord-related files from this repo to the new repo:
   ```bash
   # From the Azuret.me directory, copy these to Discord-Bot-Dashboard/src/:
   
   # Pages
   cp -r src/app/guilds Discord-Bot-Dashboard/src/app/
   cp -r src/app/azure-supporter Discord-Bot-Dashboard/src/app/
   
   # API routes
   cp -r src/app/api/auth Discord-Bot-Dashboard/src/app/api/
   cp -r src/app/api/discord Discord-Bot-Dashboard/src/app/api/
   cp -r src/app/api/guilds Discord-Bot-Dashboard/src/app/api/
   
   # Components
   cp -r src/components/rank-card Discord-Bot-Dashboard/src/components/
   
   # Libraries
   cp -r src/lib/rank-card Discord-Bot-Dashboard/src/lib/
   cp src/lib/firebase-admin.ts Discord-Bot-Dashboard/src/lib/
   cp src/lib/rank-card-utils.ts Discord-Bot-Dashboard/src/lib/
   
   # Shared utilities (needed by both)
   cp src/lib/utils.ts Discord-Bot-Dashboard/src/lib/
   
   # Some main components might be needed
   cp -r src/components/main Discord-Bot-Dashboard/src/components/
   ```

5. Install Discord-specific dependencies in new repo:
   ```bash
   cd Discord-Bot-Dashboard
   npm install discord.js firebase-admin bufferutil utf-8-validate zlib-sync
   ```

6. Copy documentation:
   ```bash
   cp RANK_CARD_DOCS.md Discord-Bot-Dashboard/
   cp RANK_CARD_SETUP.md Discord-Bot-Dashboard/
   cp SECURITY_SUMMARY.md Discord-Bot-Dashboard/
   ```

7. Create `.env.example` with Discord variables in new repo

8. Update `package.json` name in new repo:
   ```json
   {
     "name": "discord-bot-dashboard",
     "version": "0.1.0"
   }
   ```

### Step 2: Clean Up This Repository (Azuret.me)

1. Remove Discord-related files:
   ```bash
   # From Azuret.me directory
   git rm -rf src/app/guilds
   git rm -rf src/app/azure-supporter
   git rm -rf src/app/api/auth/discord
   git rm -rf src/app/api/discord
   git rm -rf src/app/api/guilds
   git rm -rf src/components/rank-card
   git rm -rf src/lib/rank-card
   git rm src/lib/firebase-admin.ts
   git rm src/lib/rank-card-utils.ts
   ```

2. Remove Discord-related documentation:
   ```bash
   git rm RANK_CARD_DOCS.md
   git rm RANK_CARD_SETUP.md
   git rm SECURITY_SUMMARY.md
   git rm RANK_CARD_SETUP.md
   ```

3. Update `package.json` to remove Discord dependencies:
   ```bash
   npm uninstall discord.js firebase-admin bufferutil utf-8-validate zlib-sync
   ```

4. Update `.env.example` to remove Discord variables

5. Update `README.md` to remove Discord feature documentation

### Step 3: Update Documentation

**In Azuret.me (this repo):**
- Update README.md to focus on personal website
- Remove Discord-related sections
- Add link to Discord Bot Dashboard repo

**In Discord-Bot-Dashboard (new repo):**
- Create comprehensive README
- Include all Discord setup instructions
- Include Firebase configuration guide

### Step 4: Test Both Projects

**Test Personal Website:**
```bash
cd Azuret.me
npm run build
npm run dev
# Visit http://localhost:3000
# Verify: Homepage, Portfolio, Blog work
```

**Test Discord Bot Dashboard:**
```bash
cd Discord-Bot-Dashboard
npm run build
npm run dev
# Visit http://localhost:3000
# Verify: Rank cards, Role selection work
```

### Step 5: Deploy

**Azuret.me:**
- Deploy to Vercel/Netlify as `azuret.net`
- Only needs Firebase client SDK

**Discord-Bot-Dashboard:**
- Deploy to Vercel as `bot.azuret.net` or similar
- Needs Firebase Admin SDK credentials
- Needs Discord bot credentials

## What Goes Where

### Keep in Azuret.me (Personal Website)
✅ Homepage with GPU rendering
✅ Portfolio (`/current`)
✅ Blog
✅ MNSW page
✅ Intent parser for social links
✅ Three.js, WebGL shaders

### Move to Discord-Bot-Dashboard
✅ Rank card system (`/guilds/...`)
✅ Role selection (`/azure-supporter`)
✅ Discord OAuth
✅ Discord.js bot integration
✅ Firebase Admin SDK

## Quick Commands

```bash
# In this repo (Azuret.me) - Remove Discord features
git rm -rf src/app/guilds src/app/azure-supporter src/app/api/auth/discord src/app/api/discord src/app/api/guilds src/components/rank-card src/lib/rank-card src/lib/firebase-admin.ts src/lib/rank-card-utils.ts
git rm RANK_CARD_DOCS.md RANK_CARD_SETUP.md SECURITY_SUMMARY.md
npm uninstall discord.js firebase-admin bufferutil utf-8-validate zlib-sync

# Commit the cleanup
git add .
git commit -m "Remove Discord features - moved to Discord-Bot-Dashboard"
git push
```

## Need Help?

See `PROJECT_SPLIT_GUIDE.md` for detailed information about:
- Complete file structure for each project
- Environment variables for each project
- Benefits of the split
- Deployment configuration
- Rollback plan if issues arise
