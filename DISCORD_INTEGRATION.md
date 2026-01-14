# Discord Community Integration Guide

This document describes how the Discord community features from the [Azuretier/Discord](https://github.com/Azuretier/Discord) repository were integrated into Azuret.me.

## Overview

The Discord repository contained a Vite + React application with interactive rule learning, quizzes, and Discord bot integration. These features have been migrated to work with Next.js 14 App Router while preserving functionality.

## What Was Integrated

### 1. Web Application Components

**Location:** `/src/components/discord-community/` and `/src/app/community/`

**Integrated Features:**
- ✅ Interactive rule learning system (11 community rules)
- ✅ Quiz system with scoring and mastery tracking
- ✅ Progress dashboard with statistics
- ✅ Quick reference search
- ✅ 47 shadcn/ui components adapted for Next.js
- ✅ Confetti celebrations and animations

**Not Integrated:**
- ❌ AI features (require Spark SDK / React 19)
- ❌ Rank card components (already exist in Azuret.me)
- ❌ React Router specific pages (converted to Next.js page.tsx)

### 2. Discord Bot

**Location:** `/discord-bot/`

The complete Discord bot from the source repository, including:
- Slash commands: `/profile`, `/leaderboard`, `/rules`, `/roles`, `/reconnect`
- XP tracking system with level progression
- Auto role assignment for new members
- Event handlers for Discord events
- KV storage service integration

### 3. Shared Libraries

**Location:** `/src/lib/discord-community/`

- `rules.ts` - 11 community rules with examples and quizzes
- `types.ts` - TypeScript type definitions
- `utils.ts` - Utility functions (cn for className merging)
- `sync.ts` - Synchronization utilities
- `api.ts` - API helper functions

### 4. Custom Hooks

**Location:** `/src/hooks/`

- `useLocalStorage.ts` - Browser localStorage state management (NEW)
- `use-kv.ts` - Key-value storage hook (from Discord repo)
- `use-mobile.ts` - Mobile detection hook (from Discord repo)

## Key Adaptations

### From React Router to Next.js App Router

**Original (Vite + React Router):**
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Adapted (Next.js App Router):**
```typescript
// /src/app/community/page.tsx
'use client';

export default function CommunityPage() {
  // Component logic
  return (
    <div>...</div>
  );
}
```

### From Spark KV to localStorage

**Original (Spark KV - requires React 19):**
```typescript
import { useKV } from '@/hooks/use-kv'

const [progress, setProgress] = useKV<RuleProgress[]>('rule-progress', defaultValue);
```

**Adapted (localStorage - React 18 compatible):**
```typescript
import { useLocalStorage } from '@/hooks/useLocalStorage'

const [progress, setProgress] = useLocalStorage<RuleProgress[]>('rule-progress', defaultValue);
```

### Import Path Updates

All imports were updated to use the new structure:

```typescript
// Before
import { Button } from '@/components/ui/button'
import { RULES } from '@/lib/rules'

// After
import { Button } from '@/components/discord-community/ui/button'
import { RULES } from '@/lib/discord-community/rules'
```

### Icon Library Consistency

The Discord repo used different icon import patterns. All were standardized:

```typescript
// Fixed
import { ChevronDown, Check, X } from "lucide-react"
// Instead of the original various import styles
```

## Dependencies Added

### Radix UI Components (17 packages)
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip

### Other UI Libraries
- @phosphor-icons/react - Icon library used in Discord repo
- sonner - Toast notifications
- date-fns - Date utilities
- marked - Markdown parser
- react-day-picker - Calendar picker
- embla-carousel-react - Carousel component
- input-otp - OTP input component
- react-resizable-panels - Resizable panels
- vaul - Drawer component
- cmdk - Command menu component
- recharts - Charting library
- react-hook-form - Form handling

All installed with `--legacy-peer-deps` for React 18 compatibility.

## File Structure

```
/src
  /app
    /community
      page.tsx                    # Main community learning page
  /components
    /discord-community
      Confetti.tsx               # Celebration animation
      ProfileCard.tsx            # User profile display
      ProgressDashboard.tsx      # Progress tracking UI
      QuickReference.tsx         # Searchable rule reference
      RetroDecorations.tsx       # Visual decorations
      RoleCustomizer.tsx         # Role selection UI
      RuleLesson.tsx             # Interactive lesson component
      RuleQuiz.tsx               # Quiz component with scoring
      RulesDialog.tsx            # Rules display dialog
      /pages
        HomePage.tsx             # Original HomePage (reference)
      /ui                        # 47 shadcn/ui components
        accordion.tsx
        alert-dialog.tsx
        avatar.tsx
        badge.tsx
        button.tsx
        card.tsx
        checkbox.tsx
        ... (and 40 more)
  /lib
    /discord-community
      api.ts                     # API utilities
      rank-card-service.ts       # Rank card service
      rank-card-types.ts         # Rank card types
      rules.ts                   # 11 community rules + quizzes
      sync.ts                    # Sync utilities
      types.ts                   # Type definitions
      utils.ts                   # cn utility function
  /types
    community.ts                 # RuleProgress type
  /hooks
    useLocalStorage.ts           # localStorage hook (NEW)
    use-kv.ts                    # KV storage hook (from Discord)
    use-mobile.ts                # Mobile detection (from Discord)

/discord-bot                     # Standalone Discord bot
  /src
    /commands                    # Slash commands
    /events                      # Event handlers
    /services                    # Services (XP, KV, roles)
    /utils                       # Utilities
  QUICKSTART.md                  # Bot setup guide
  README.md                      # Bot documentation
```

## Build Configuration

### tsconfig.json
Added exclusion for discord-bot folder:
```json
{
  "exclude": ["node_modules", "discord-bot"]
}
```

### declarations.d.ts
Added Spark SDK types for AI components (kept for future use):
```typescript
interface SparkSDK {
  llm(prompt: string, model: string, json?: boolean): Promise<string>;
  kv: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
  };
}

interface Window {
  spark?: SparkSDK;
}
```

## Usage

### Accessing the Community Page

Visit: `https://azuret.net/community`

### Features Available

1. **Learn Tab** - Read through community rules with examples
2. **Quiz Tab** - Test your knowledge (unlocked after reading)
3. **Progress Tab** - View completion status and points earned
4. **Reference Tab** - Search and browse all rules

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000/community
```

### Discord Bot Setup

```bash
# Navigate to bot folder
cd discord-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Discord credentials

# Deploy commands to Discord
npm run deploy-commands

# Start the bot
npm start
```

## Performance

### Bundle Sizes

- Community page: 45.4 kB (170 kB First Load JS)
- Optimized with Next.js automatic code splitting
- Lazy loading for heavy components

### Optimization Applied

1. **Dynamic Imports** - Components loaded on demand
2. **Route-level Splitting** - Each page has its own bundle
3. **Shared Chunks** - Common UI components shared across routes
4. **Tree Shaking** - Unused code eliminated during build

## Testing Checklist

- [x] Build completes without errors
- [x] TypeScript compilation passes
- [x] All existing routes still work
- [x] Community page loads successfully
- [x] Rule lessons display correctly
- [x] Quizzes function properly
- [x] Progress tracking persists in localStorage
- [x] UI components render correctly
- [x] Animations work smoothly
- [x] Responsive design works on mobile

## Future Enhancements

### Potential Additions

1. **AI Features Integration** - Requires upgrading to React 19 and Spark SDK
2. **Backend Storage** - Replace localStorage with database for cross-device sync
3. **Discord Bot Integration** - Connect community page progress with Discord XP
4. **Additional Rules** - Expand beyond current 11 rules
5. **Gamification** - Add achievements, badges, leaderboards
6. **Multi-language** - Japanese/English translations

### Excluded Features

The following were intentionally not integrated:

- AI Activity Analyzer
- AI Insights  
- AI Profile Summary
- AI Role Recommender
- AI Rules Assistant

These components require the Spark SDK and React 19, which are not compatible with the current setup. They have been documented for potential future integration.

## Troubleshooting

### Build Issues

If you encounter build errors:

1. **Missing Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **TypeScript Errors**
   - Check that all imports use the correct paths
   - Verify `@/` alias points to `./src/`

3. **Module Not Found**
   - Ensure tsconfig.json excludes `discord-bot` folder
   - Clear Next.js cache: `rm -rf .next`

### Runtime Issues

1. **localStorage Not Working**
   - Check browser privacy settings
   - Verify `useLocalStorage` hook is used client-side only

2. **Components Not Rendering**
   - Ensure `'use client'` directive is present
   - Check for hydration mismatches

## References

- Source Repository: https://github.com/Azuretier/Discord
- Next.js Documentation: https://nextjs.org/docs
- shadcn/ui Components: https://ui.shadcn.com
- Radix UI: https://www.radix-ui.com

## Acknowledgments

The community learning system was originally developed for the Azure Community Discord server and has been adapted for use in Azuret.me while preserving all core functionality.
