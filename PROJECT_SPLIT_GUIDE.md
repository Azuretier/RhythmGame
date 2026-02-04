# Project Split Guide: Azuret.me → Two Separate Projects

## Overview

This guide outlines how to split the current monolithic Next.js application into two focused, manageable projects.

## Current State

The repository currently contains:
- Personal website features (homepage, portfolio, blog)
- Discord bot management features (rank cards, role selection)
- Shared dependencies and infrastructure

## Proposed Split

### Project 1: Azuret.me (Personal Website)
**Repository**: Keep current `Azuretier/Azuret.me`
**Purpose**: Personal portfolio, blog, and interactive homepage
**URL**: `azuret.net`

#### Features to Keep
- ✅ Interactive homepage with GPU-rendered background (`/`)
- ✅ Portfolio page (`/current`)
- ✅ Blog section (`/blog`)
- ✅ MNSW page (`/MNSW`)
- ✅ Intent-based social media navigation

#### Files to Keep
```
src/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── layout.tsx
│   ├── globals.css
│   ├── current/                    # Portfolio
│   ├── blog/                       # Blog
│   └── MNSW/                       # MNSW page
├── components/
│   ├── home/                       # Homepage components
│   ├── portfolio/                  # Portfolio components
│   ├── blog/                       # Blog components
│   ├── MNSW/                       # MNSW components
│   └── main/                       # Shared UI components
├── lib/
│   ├── intent/                     # Intent parser
│   ├── portfolio/                  # Portfolio utilities
│   └── utils.ts                    # Shared utilities
public/
├── shaders/                        # WebGL shaders
└── (other static assets)
```

#### Dependencies to Keep
```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "firebase": "^12.6.0",              // Client SDK only
    "framer-motion": "^11.11.9",
    "lucide-react": "^0.525.0",
    "next": "^14.2.35",
    "next-themes": "^0.3.0",
    "react": "^18",
    "react-dom": "^18",
    "react-icons": "^5.3.0",
    "tailwind-merge": "^2.5.4",
    "three": "^0.179.1"                 // For 3D rendering
  }
}
```

---

### Project 2: Discord Bot Dashboard (New Repository)
**Repository**: Create new `Azuretier/Discord-Bot-Dashboard`
**Purpose**: Discord bot management, rank cards, and role selection
**URL**: `bot.azuret.net` or similar

#### Features to Move
- ✅ Rank card system (`/guilds/[guild_id]/rank-card/[display_name]`)
- ✅ Role selection page (`/azure-supporter`)
- ✅ Discord OAuth integration
- ✅ Firebase Admin SDK for server-side operations

#### Files to Move
```
src/
├── app/
│   ├── api/
│   │   ├── auth/discord/           # Discord OAuth
│   │   ├── discord/                # Discord bot endpoints
│   │   └── guilds/                 # Rank card API
│   ├── azure-supporter/            # Role selection page
│   └── guilds/                     # Rank card pages
├── components/
│   └── rank-card/                  # Rank card components
├── lib/
│   ├── firebase-admin.ts           # Admin SDK
│   ├── rank-card/                  # Rank card utilities
│   └── rank-card-utils.ts
```

#### Dependencies to Move
```json
{
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.0",
    "bufferutil": "^4.1.0",            // Discord.js dependency
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "discord.js": "^14.17.3",          // Discord bot
    "firebase": "^12.6.0",             // Client SDK
    "firebase-admin": "^13.6.0",       // Server SDK
    "framer-motion": "^11.11.9",
    "lucide-react": "^0.525.0",
    "next": "^14.2.35",
    "next-themes": "^0.3.0",
    "react": "^18",
    "react-dom": "^18",
    "react-icons": "^5.3.0",
    "tailwind-merge": "^2.5.4",
    "utf-8-validate": "^6.0.6",        // Discord.js dependency
    "zlib-sync": "^0.1.10"             // Discord.js dependency
  }
}
```

---

## Migration Steps

### Phase 1: Prepare Discord Bot Dashboard (New Repo)

1. **Create New Repository**
   ```bash
   # On GitHub, create new repository: Discord-Bot-Dashboard
   git clone https://github.com/Azuretier/Discord-Bot-Dashboard.git
   cd Discord-Bot-Dashboard
   ```

2. **Initialize Next.js Project**
   ```bash
   npx create-next-app@14.2.35 . --typescript --tailwind --app --no-src-dir
   ```

3. **Copy Discord-Related Files**
   - Copy `src/app/guilds/` directory
   - Copy `src/app/azure-supporter/` directory
   - Copy `src/app/api/auth/discord/` directory
   - Copy `src/app/api/discord/` directory
   - Copy `src/app/api/guilds/` directory
   - Copy `src/components/rank-card/` directory
   - Copy `src/lib/firebase-admin.ts`
   - Copy `src/lib/rank-card/` directory
   - Copy `src/lib/rank-card-utils.ts`

4. **Update Dependencies**
   - Install Discord-specific packages
   - Configure Firebase Admin SDK
   - Set up environment variables

5. **Update Documentation**
   - Create README for Discord Bot Dashboard
   - Copy and adapt `RANK_CARD_DOCS.md`
   - Copy and adapt `RANK_CARD_SETUP.md`
   - Update environment variable documentation

### Phase 2: Clean Up Main Website (This Repo)

1. **Remove Discord-Related Code**
   ```bash
   # Remove Discord bot features
   rm -rf src/app/guilds/
   rm -rf src/app/azure-supporter/
   rm -rf src/app/api/auth/discord/
   rm -rf src/app/api/discord/
   rm -rf src/app/api/guilds/
   rm -rf src/components/rank-card/
   rm -rf src/lib/rank-card/
   rm src/lib/firebase-admin.ts
   rm src/lib/rank-card-utils.ts
   ```

2. **Update Dependencies**
   ```bash
   # Remove Discord-specific packages
   npm uninstall discord.js firebase-admin bufferutil utf-8-validate zlib-sync
   ```

3. **Update Configuration Files**
   - Update `package.json` to remove Discord dependencies
   - Update `.env.example` to remove Discord variables
   - Update `README.md` to focus on personal website features
   - Remove Discord-related documentation files

4. **Update Navigation/Routes**
   - Remove links to Discord features
   - Update homepage to not reference Discord bot features

### Phase 3: Update Documentation

1. **Main Website (Azuret.me)**
   - Update README.md with only personal website features
   - Remove Discord-related setup instructions
   - Add link to Discord Bot Dashboard repository
   - Simplify environment variables

2. **Discord Bot Dashboard**
   - Create comprehensive README
   - Include Firebase setup instructions
   - Include Discord bot setup instructions
   - Document all API endpoints

---

## Environment Variables Split

### Azuret.me (Personal Website)
```bash
# Firebase Configuration (Portfolio/MNSW)
NEXT_PUBLIC_MNSW_FIREBASE_API_KEY='...'
NEXT_PUBLIC_MNSW_FIREBASE_AUTH_DOMAIN='...'
NEXT_PUBLIC_MNSW_FIREBASE_PROJECT_ID='...'
NEXT_PUBLIC_MNSW_FIREBASE_STORAGE_BUCKET='...'
NEXT_PUBLIC_MNSW_FIREBASE_MESSAGING_SENDER_ID='...'
NEXT_PUBLIC_MNSW_FIREBASE_APP_ID='...'

NEXT_PUBLIC_PORTFOLIO_FIREBASE_API_KEY='...'
NEXT_PUBLIC_PORTFOLIO_FIREBASE_AUTH_DOMAIN='...'
NEXT_PUBLIC_PORTFOLIO_FIREBASE_PROJECT_ID='...'
NEXT_PUBLIC_PORTFOLIO_FIREBASE_STORAGE_BUCKET='...'
NEXT_PUBLIC_PORTFOLIO_FIREBASE_MESSAGING_SENDER_ID='...'
NEXT_PUBLIC_PORTFOLIO_FIREBASE_APP_ID='...'
```

### Discord Bot Dashboard
```bash
# Firebase Configuration (Rank Cards)
NEXT_PUBLIC_MNSW_FIREBASE_API_KEY='...'
NEXT_PUBLIC_MNSW_FIREBASE_AUTH_DOMAIN='...'
NEXT_PUBLIC_MNSW_FIREBASE_PROJECT_ID='...'
NEXT_PUBLIC_MNSW_FIREBASE_STORAGE_BUCKET='...'
NEXT_PUBLIC_MNSW_FIREBASE_MESSAGING_SENDER_ID='...'
NEXT_PUBLIC_MNSW_FIREBASE_APP_ID='...'

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Discord Bot Configuration
DISCORD_BOT_TOKEN='...'
DISCORD_GUILD_ID='...'
DISCORD_ROLE_EN='...'
DISCORD_ROLE_JP='...'

# Discord OAuth2 Configuration
DISCORD_CLIENT_ID='...'
DISCORD_CLIENT_SECRET='...'
NEXT_PUBLIC_DISCORD_CLIENT_ID='...'
NEXT_PUBLIC_DISCORD_REDIRECT_URI='...'
```

---

## Benefits of Split

### 1. **Easier Management**
- Each project has a clear, focused purpose
- Simpler dependency management
- Easier to reason about code structure

### 2. **Better Deployment**
- Personal website can be deployed independently
- Discord bot dashboard can scale separately
- Different caching strategies per project

### 3. **Improved Security**
- Discord bot secrets isolated from public website
- Firebase Admin SDK only in bot dashboard
- Reduced attack surface for personal website

### 4. **Cleaner Dependencies**
- No Discord.js in personal website
- No Three.js in bot dashboard
- Smaller bundle sizes for each project

### 5. **Independent Updates**
- Update personal website without affecting bot
- Update bot features without redeploying website
- Different CI/CD pipelines

---

## Deployment Configuration

### Azuret.me (Personal Website)
**Platform**: Vercel, Netlify, or similar
**Domain**: `azuret.net`
**Build Command**: `npm run build`
**Output Directory**: `.next`

### Discord Bot Dashboard
**Platform**: Vercel (recommended for serverless functions)
**Domain**: `bot.azuret.net` or subdomain
**Build Command**: `npm run build`
**Output Directory**: `.next`
**Required**: Firebase Admin SDK credentials

---

## Shared Components Strategy

If you need shared UI components between projects:

1. **Option A: Copy Components**
   - Duplicate shared components in each project
   - Simplest approach for small number of components

2. **Option B: Create npm Package**
   - Create `@azuret/ui-components` package
   - Publish to npm or use as git submodule
   - Import in both projects

3. **Option C: Monorepo (Alternative)**
   - Use tools like Turborepo or Nx
   - Keep both projects in same repository but separate apps
   - Share packages within monorepo

---

## Testing the Split

### Verify Personal Website
```bash
cd Azuret.me
npm install
npm run build
npm run dev
# Visit http://localhost:3000
# Test: Homepage, Portfolio, Blog, MNSW
```

### Verify Discord Bot Dashboard
```bash
cd Discord-Bot-Dashboard
npm install
npm run build
npm run dev
# Visit http://localhost:3000
# Test: Rank cards, Role selection, OAuth
```

---

## Rollback Plan

If issues arise during split:

1. **Keep original repository** until split is verified
2. **Test both projects thoroughly** before deleting code
3. **Document all environment variables** before split
4. **Backup databases** if applicable
5. **Update DNS gradually** (use subdomains first)

---

## Timeline Estimate

- **Phase 1** (New Discord Bot Dashboard): 2-4 hours
- **Phase 2** (Clean up main website): 1-2 hours  
- **Phase 3** (Documentation updates): 1-2 hours
- **Testing and Verification**: 2-3 hours

**Total**: 6-11 hours of work

---

## Next Steps

1. ✅ Review this split guide
2. ⬜ Confirm the proposed architecture
3. ⬜ Create new Discord Bot Dashboard repository
4. ⬜ Begin Phase 1: Set up new repository
5. ⬜ Begin Phase 2: Clean up main website
6. ⬜ Begin Phase 3: Update documentation
7. ⬜ Test both projects thoroughly
8. ⬜ Deploy to production

---

## Questions to Answer

Before proceeding with the split, please confirm:

1. **Is this the correct split?** (Personal website vs Discord bot features)
2. **Should we use a monorepo instead?** (Turborepo/Nx)
3. **What should the new repository be named?** (Discord-Bot-Dashboard?)
4. **Should shared components be extracted?** (UI library package?)
5. **What domains should each project use?** (azuret.net vs bot.azuret.net?)

---

## Support

For questions or issues during the split:
- Review this guide
- Check original INTEGRATION_SUMMARY.md for feature details
- Refer to RANK_CARD_DOCS.md for Discord features
- Refer to HOMEPAGE_GUIDE.md for website features
