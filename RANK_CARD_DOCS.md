# Rank Card Feature Documentation

## Overview

The Rank Card feature provides a real-time, Unicode-safe display of Discord member rank information using Firestore as the data backend. Members can view their rank cards at a unique URL that automatically updates when their stats change.

## Architecture

### Flow Diagram
```
User visits URL
    ↓
Page decodes & normalizes display name
    ↓
Page calls /api/.../ensure endpoint
    ↓
Server queries Firestore members collection
    ↓
Server writes/updates rankCards document
    ↓
Page subscribes to document via onSnapshot
    ↓
Real-time UI updates on data changes
```

### Components

1. **Page Component**: `src/app/guilds/[guild_id]/rank-card/[user_discord_display_name]/page.tsx`
   - Client-side React component
   - Handles URL parameters with Unicode support
   - Manages real-time Firestore subscription
   - Renders different states (loading, found, not found, ambiguous, error)

2. **API Route**: `src/app/api/guilds/[guild_id]/rank-card/ensure/route.ts`
   - Server-side API endpoint
   - Uses Firebase Admin SDK for Firestore writes
   - Queries members and creates/updates rank cards
   - Handles edge cases (not found, ambiguous matches)

3. **UI Components**:
   - `RankCard.tsx`: Modern glassmorphic rank card with gradient effects
   - `RankCardSkeleton.tsx`: Loading state with shimmer animation

4. **Utilities**:
   - `firebase-admin.ts`: Firebase Admin SDK initialization
   - `rank-card-utils.ts`: Display name normalization and card ID generation

## Setup Instructions

### 1. Firebase Admin SDK Configuration

The Firebase Admin SDK is required for server-side Firestore operations.

**Step 1: Generate Service Account**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to: Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the downloaded JSON file securely

**Step 2: Configure Environment Variable**
Add to your `.env` file:
```bash
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"...@...iam.gserviceaccount.com",...}'
```

> **Important**: The entire JSON must be on a single line. Remove any line breaks from the private key field.

**For Vercel Deployment**:
1. Go to Project Settings → Environment Variables
2. Add `FIREBASE_SERVICE_ACCOUNT_JSON` with the JSON content
3. Ensure it's available for Production/Preview/Development as needed

### 2. Firestore Data Structure

#### Members Collection
Path: `guilds/{guildId}/members/{memberId}`

Required fields:
```typescript
{
  displayName: string;          // User's display name
  displayNameKey: string;        // Lowercase NFKC-normalized name for queries
  xp: number;                    // Total experience points
  level: number;                 // Current level
  rankName?: string;             // Role/tier name (optional)
  avatarUrl?: string;            // Avatar URL (can also be misspelled as avaterUrl)
}
```

**Important**: Add a Firestore index on `displayNameKey` for efficient queries:
```
Collection: guilds/{guildId}/members
Fields: displayNameKey (Ascending)
```

#### Rank Cards Collection (Auto-generated)
Path: `guilds/{guildId}/rankCards/{cardId}`

The ensure endpoint automatically creates/updates these documents:
```typescript
{
  guildId: string;
  memberId?: string;            // Present when status is 'found'
  displayName: string;
  displayNameKey: string;
  level?: number;
  xp?: number;
  rankName?: string | null;
  avatarUrl?: string | null;
  status: 'found' | 'not_found' | 'ambiguous';
  candidates?: Array<{...}>;   // Present when status is 'ambiguous'
  updatedAt: string;            // ISO timestamp
}
```

### 3. Client-side Firebase Configuration

Ensure your client-side Firebase config is set in `.env`:
```bash
NEXT_PUBLIC_MNSW_FIREBASE_API_KEY=...
NEXT_PUBLIC_MNSW_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_MNSW_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_MNSW_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_MNSW_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_MNSW_FIREBASE_APP_ID=...
```

## Usage

### Accessing Rank Cards

URL Pattern:
```
/guilds/{guild_id}/rank-card/{user_discord_display_name}
```

Examples:
```
/guilds/123456789/rank-card/JohnDoe
/guilds/123456789/rank-card/ユーザー名    (Unicode supported!)
/guilds/123456789/rank-card/User%20With%20Spaces
```

### Display Name Normalization

The system uses NFKC normalization for consistent Unicode handling:

1. **URL Decoding**: `decodeURIComponent()` processes the URL parameter
2. **Trimming**: Removes leading/trailing whitespace
3. **NFKC Normalization**: Converts to standard Unicode form
4. **Lowercase**: Creates `displayNameKey` for efficient queries

Example:
```javascript
"Ｕｓｅｒ" → normalized → "user"  // Full-width to half-width
"Café" → normalized → "café"      // Preserves accents
```

### API Endpoint

**POST** `/api/guilds/{guild_id}/rank-card/ensure`

Request body:
```json
{
  "displayName": "JohnDoe"
}
```

Responses:

**Success (Member Found)**
```json
{
  "status": "found",
  "cardId": "abc123...",
  "data": {
    "displayName": "JohnDoe",
    "level": 25,
    "xp": 12500,
    "rankName": "Elite",
    "avatarUrl": "https://..."
  }
}
```

**Not Found**
```json
{
  "status": "not_found",
  "cardId": "abc123...",
  "message": "Member not found"
}
```

**Ambiguous (Multiple Matches)**
```json
{
  "status": "ambiguous",
  "cardId": "abc123...",
  "candidates": [
    { "id": "1", "displayName": "John", "level": 10, "xp": 5000 },
    { "id": "2", "displayName": "John", "level": 15, "xp": 7500 }
  ],
  "message": "Multiple members found with this display name"
}
```

## UI States

### Loading State
- Animated skeleton with glassmorphic design
- Shimmer sweep animation
- Gradient mesh background

### Found State
- Full rank card display
- Avatar (or initial letter fallback)
- Display name and rank badge
- Level indicator
- XP progress bar with gradient
- Real-time update indicator

### Not Found State
- Search icon (🔍)
- Clear message
- No member exists with that display name

### Ambiguous State
- Warning icon (⚠️)
- List of matching candidates
- Shows level and XP for each

### Error State
- Error icon (❌)
- Error message
- Network or server issues

## Technical Details

### Card ID Generation

Card IDs are deterministic SHA-256 hashes:
```typescript
cardId = sha256(guildId + ':' + displayNameKey)
```

This ensures:
- Same display name always gets same card ID
- URL-safe identifiers
- No collisions across guilds

### Real-time Updates

Uses Firestore's `onSnapshot` listener:
```typescript
onSnapshot(doc(db, `guilds/${guildId}/rankCards/${cardId}`), (snapshot) => {
  // UI updates automatically
});
```

Benefits:
- Instant UI updates when data changes
- No polling required
- Automatic reconnection handling

### XP Progress Calculation

The rank card calculates XP progress visually:
```typescript
const xpForCurrentLevel = level * 1000;
const xpForNextLevel = (level + 1) * 1000;
const xpInCurrentLevel = xp - xpForCurrentLevel;
const progressPercentage = (xpInCurrentLevel / xpNeededForLevel) * 100;
```

> **Note**: This uses a simple 1000 XP per level calculation. Adjust the formula in `RankCard.tsx` if your system uses different XP scaling.

## Customization

### Styling

The rank card uses Tailwind CSS with custom animations defined in `globals.css`:
- `animate-shimmer-sweep`: Loading skeleton animation
- `animate-pulse-slow`: Breathing animation for accents

### XP Formula

Modify the XP calculation in `src/components/rank-card/RankCard.tsx`:
```typescript
// Change these lines to match your leveling system
const xpForCurrentLevel = level * 1000;  // Adjust multiplier
const xpForNextLevel = (level + 1) * 1000;
```

### Card Design

The `RankCard.tsx` component can be customized:
- Colors: Modify gradient classes
- Layout: Adjust flex/grid structures
- Animations: Add/remove motion effects

## Security Considerations

1. **Service Account**: Keep `FIREBASE_SERVICE_ACCOUNT_JSON` secret
2. **Firestore Rules**: Ensure proper read/write rules are configured
3. **Rate Limiting**: Consider adding rate limiting to the ensure endpoint
4. **Input Validation**: Display names are validated and normalized

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_JSON is not set"
- Check your `.env` file or Vercel environment variables
- Ensure the variable name matches exactly
- Verify the JSON is valid (use a JSON validator)

### "Failed to fetch firebase-admin"
- Run `npm install firebase-admin`
- Check your Node.js version (requires 14+)

### "Document not updating in real-time"
- Verify client-side Firebase config is correct
- Check browser console for Firestore errors
- Ensure Firestore rules allow reads

### "Member not found" for existing members
- Verify `displayNameKey` field exists in members documents
- Check that the field is lowercase NFKC normalized
- Ensure Firestore index exists on `displayNameKey`

## Performance Optimization

### Firestore Indexes
Create composite indexes for common queries:
```
Collection: guilds/{guildId}/members
Fields: 
  - displayNameKey (Ascending)
  - level (Descending)
```

### Caching
The ensure endpoint uses `merge: true` to avoid overwriting unchanged fields, reducing write costs.

### Client-side
The page subscribes only to a single document, minimizing real-time listener costs.

## Future Enhancements

Potential improvements:
- [ ] Add rank history tracking
- [ ] Implement leaderboard integration
- [ ] Add social sharing features
- [ ] Create embeddable widgets
- [ ] Add rank comparison feature
- [ ] Implement achievement badges
- [ ] Add custom themes/skins

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firestore rules and indexes
3. Verify environment variables are set correctly
4. Check browser console and server logs for errors
