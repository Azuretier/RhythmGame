# Discord Rank Card System Setup

## Overview

The rank card system provides a dynamic, real-time rank card display for Discord server members based on their XP and level data stored in Firebase Firestore.

## Features

- **Real-time Updates**: Uses Firebase Firestore for real-time data synchronization
- **Unique URL per Member**: Each member gets a persistent URL based on their display name
- **Smart Matching**: Handles ambiguous and not-found cases gracefully
- **Beautiful UI**: Glass-morphism design with gradient effects
- **Responsive**: Works on all device sizes

## Prerequisites

1. Firebase project with Firestore enabled
2. Firebase Admin SDK service account JSON
3. Node.js 18+ and npm

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Firestore Database

### 2. Firestore Data Structure

```
/guilds/{guild_id}/
  ├── members/{member_id}
  │   ├── displayName: string
  │   ├── displayNameKey: string (normalized)
  │   ├── level: number
  │   ├── xp: number
  │   ├── rankName?: string
  │   └── avatarUrl?: string
  │
  └── rankCards/{card_id}
      ├── status: 'ready' | 'not_found' | 'ambiguous' | 'error'
      ├── displayNameOriginal: string
      ├── displayNameKey: string
      ├── memberId?: string
      ├── level?: number
      ├── xp?: number
      ├── xpToNext?: number
      ├── rankName?: string
      ├── avatarUrl?: string
      ├── updatedAt: string
      └── candidates?: Array<{memberId, displayName}>
```

### 3. Get Firebase Admin SDK

1. In Firebase Console, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the downloaded JSON file securely
4. Copy the entire JSON content as a single line

### 4. Configure Environment Variables

Add to `.env` file:

```bash
# Client-side Firebase (public)
NEXT_PUBLIC_RANKCARD_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_RANKCARD_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_RANKCARD_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_RANKCARD_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_RANKCARD_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_RANKCARD_FIREBASE_APP_ID=your_app_id

# Server-side Firebase Admin (private - keep secure!)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

⚠️ **Security**: Never commit `.env` to version control. Add it to `.gitignore`.

## Usage

### URL Format

```
https://your-domain.com/guilds/{guild_id}/rank-card/{display_name}
```

### Example

```
https://azuret.me/guilds/123456789/rank-card/Azur
```

### How It Works

1. **User Requests Card**: Navigate to the rank card URL
2. **Normalization**: Display name is normalized (lowercase, NFKC)
3. **Lookup**: System searches for matching member in Firestore
4. **Card Generation**: 
   - **Ready**: Single match → Display rank card
   - **Not Found**: No match → Show "member not found" message
   - **Ambiguous**: Multiple matches → Show list of candidates
5. **Real-time**: Card updates automatically when member data changes

### Member Data Updates

To update member XP/level data, your Discord bot should write to Firestore:

```typescript
// Example: Update member data
import { getAdminDb } from '@/lib/rank-card/firebase-admin';

async function updateMemberXP(guildId: string, memberId: string, xp: number, level: number) {
  const db = getAdminDb();
  const memberRef = db.doc(`guilds/${guildId}/members/${memberId}`);
  
  await memberRef.set({
    displayName: 'Username',
    displayNameKey: 'username', // normalized
    level,
    xp,
    rankName: 'Silver',
    avatarUrl: 'https://...',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
```

## API Reference

### POST `/api/guilds/[guild_id]/rank-card/ensure`

Creates or updates a rank card for a given display name.

**Request Body:**
```json
{
  "displayNameOriginal": "Azur"
}
```

**Response:**
```json
{
  "cardId": "abc123...",
  "status": "ready",
  "data": {
    "level": 42,
    "xp": 4500,
    "xpToNext": 500,
    "rankName": "Diamond",
    "avatarUrl": "https://..."
  }
}
```

## Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard
2. Deploy as normal Next.js app
3. Ensure Firestore security rules allow read access for rank cards

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to rank cards (public display)
    match /guilds/{guildId}/rankCards/{cardId} {
      allow read: if true;
    }
    
    // Allow read access to members (for lookups)
    match /guilds/{guildId}/members/{memberId} {
      allow read: if true;
    }
    
    // Write access should be controlled by Admin SDK only
    // No client-side writes allowed
  }
}
```

## Troubleshooting

### "Member Not Found"
- Check display name spelling
- Verify member exists in Firestore
- Check `displayNameKey` field is set correctly

### "Ambiguous Match"
- Multiple members with same normalized display name
- Contact admin to resolve duplicate names
- Consider using member IDs instead

### Firebase Admin Errors
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly
- Check service account has Firestore permissions
- Ensure JSON is valid (no extra line breaks)

### Card Not Updating
- Check Firestore listener is active
- Verify member data was updated in Firestore
- Check browser console for errors

## Development

### Local Testing

```bash
# Install dependencies
npm install

# Set up .env file
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev

# Visit
# http://localhost:3000/guilds/YOUR_GUILD_ID/rank-card/TestUser
```

### Testing with Mock Data

```typescript
// Create test member in Firestore
import { getAdminDb } from '@/lib/rank-card/firebase-admin';

const db = getAdminDb();
await db.doc('guilds/test-guild/members/test-user').set({
  displayName: 'TestUser',
  displayNameKey: 'testuser',
  level: 10,
  xp: 1000,
  rankName: 'Bronze',
  avatarUrl: 'https://via.placeholder.com/150',
});
```

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Firebase Console for errors
- Check browser console for client-side errors
- Verify environment variables are set correctly
