# Discord Role Selection - Testing Guide

## Overview
This guide explains how to test the Discord role selection feature manually.

## Prerequisites for Testing

### 1. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or use an existing one
3. Navigate to the "Bot" section
4. Enable the following Privileged Gateway Intents:
   - Server Members Intent
5. Copy the bot token
6. Invite the bot to your server with these permissions:
   - Manage Roles
   - View Channels

### 2. Discord OAuth2 Setup
1. In the same application, go to "OAuth2" → "General"
2. Copy the Client ID and Client Secret
3. Add redirect URL: `http://localhost:3000/api/auth/discord/callback`

### 3. Create Discord Roles
1. In your Discord server, create two roles:
   - EN (English role)
   - JP (Japanese role)
2. Make sure the bot's role is positioned ABOVE these roles in the role hierarchy
3. Right-click each role → Copy Role ID (enable Developer Mode in Discord settings first)
4. Right-click your server → Copy Server ID

### 4. Configure Environment Variables
Update your `.env` file with the actual values:

```bash
DISCORD_BOT_TOKEN='your_actual_bot_token'
DISCORD_GUILD_ID='your_actual_server_id'
DISCORD_ROLE_EN='your_actual_en_role_id'
DISCORD_ROLE_JP='your_actual_jp_role_id'
DISCORD_CLIENT_ID='your_actual_client_id'
DISCORD_CLIENT_SECRET='your_actual_client_secret'
NEXT_PUBLIC_DISCORD_CLIENT_ID='your_actual_client_id'
NEXT_PUBLIC_DISCORD_REDIRECT_URI='http://localhost:3000/api/auth/discord/callback'
```

## Test Scenarios

### Test 1: Discord OAuth Login
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/azure-supporter`
3. Click "Login with Discord"
4. Authorize the application
5. **Expected**: You should be redirected back to the page with your Discord username shown

### Test 2: Select EN Role
1. After logging in, click the "English 🇺🇸" button
2. Click "Confirm & Sync to Discord"
3. **Expected**: 
   - Button shows "Syncing..." briefly
   - Success message appears
   - Check Discord: EN role should be assigned

### Test 3: Switch to JP Role
1. Click the "日本語 🇯🇵" button
2. Click "Confirm & Sync to Discord"
3. **Expected**:
   - Button shows "Syncing..." briefly
   - Success message appears
   - Check Discord: JP role assigned, EN role removed

### Test 4: Reload Page - Persistence
1. Refresh the page
2. **Expected**:
   - You should still be logged in (via localStorage)
   - Current role should be displayed below your username
   - The currently assigned role button should be highlighted

### Test 5: Error Handling - User Not in Server
1. Log in with a Discord account that is NOT a member of the configured server
2. Try to select a role
3. **Expected**: Error message: "Discord user not found in server. Please make sure you have joined the server."

### Test 6: Error Handling - Missing Configuration
1. Remove one of the Discord environment variables
2. Restart the server
3. Try to select a role
4. **Expected**: Error message: "Discord configuration is incomplete"

### Test 7: Logout and Re-login
1. Click "Disconnect Discord"
2. **Expected**: Logged out, shows login screen
3. Log in again
4. **Expected**: Can log in and select roles again

## Troubleshooting

### Issue: "Discord user not found in server"
- **Solution**: Make sure your Discord account has joined the server configured in DISCORD_GUILD_ID

### Issue: "Bot does not have permission to manage roles"
- **Solution**: Check bot permissions in server settings, ensure "Manage Roles" is enabled

### Issue: "Bot cannot assign this role due to role hierarchy"
- **Solution**: Move the bot's role ABOVE the EN and JP roles in Server Settings → Roles

### Issue: "Discord configuration is incomplete"
- **Solution**: Verify all environment variables are set correctly in .env

### Issue: OAuth callback fails
- **Solution**: 
  - Verify redirect URI matches exactly in Discord Developer Portal
  - Check NEXT_PUBLIC_DISCORD_REDIRECT_URI in .env
  - Ensure DISCORD_CLIENT_SECRET is correct

## API Testing with curl

### Get Current Role
```bash
curl "http://localhost:3000/api/discord/assign-role?userId=YOUR_DISCORD_USER_ID"
```

### Assign EN Role
```bash
curl -X POST "http://localhost:3000/api/discord/assign-role" \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_DISCORD_USER_ID","role":"EN"}'
```

### Assign JP Role
```bash
curl -X POST "http://localhost:3000/api/discord/assign-role" \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_DISCORD_USER_ID","role":"JP"}'
```

## Security Considerations

✅ Bot token is server-side only (not exposed to client)
✅ OAuth2 client secret is server-side only
✅ Role validation ensures only EN/JP can be assigned
✅ Discord permissions checked before role assignment
✅ Error messages don't expose sensitive information
✅ No XSS vulnerabilities in error handling

---

# Discord Rank Card System - Testing Guide

## Overview
This section explains how to test the Discord Rank Card feature with real-time updates.

## Prerequisites for Testing

### 1. Firebase Project Setup
1. Create a Firebase project (or use existing)
2. Enable Firestore Database
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Save the JSON file

### 2. Environment Variables

Add to your `.env` file:

```bash
# Firebase Admin SDK (Server-side only)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Firebase Client Config (Rank Card)
NEXT_PUBLIC_RANKCARD_FIREBASE_API_KEY='your_api_key'
NEXT_PUBLIC_RANKCARD_FIREBASE_AUTH_DOMAIN='your_auth_domain'
NEXT_PUBLIC_RANKCARD_FIREBASE_PROJECT_ID='your_project_id'
NEXT_PUBLIC_RANKCARD_FIREBASE_STORAGE_BUCKET='your_storage_bucket'
NEXT_PUBLIC_RANKCARD_FIREBASE_MESSAGING_SENDER_ID='your_sender_id'
NEXT_PUBLIC_RANKCARD_FIREBASE_APP_ID='your_app_id'
```

### 3. Firestore Data Setup

Create test member documents in Firestore:

**Collection:** `guilds/{guildId}/members/{memberId}`

**Example document:**
```json
{
  "displayName": "TestUser",
  "displayNameKey": "testuser",
  "level": 5,
  "xp": 350,
  "rankName": "Warrior",
  "avatarUrl": "https://example.com/avatar.png"
}
```

**Important:** Always include `displayNameKey` with normalized value:
```javascript
displayNameKey = displayName.trim().normalize('NFKC').toLowerCase()
```

### 4. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guilds/{guildId}/rankCards/{cardId} {
      allow read: if true;
      allow write: if false;
    }
    match /guilds/{guildId}/members/{memberId} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

## Test Scenarios

### Test 1: Basic Rank Card Display
1. Navigate to: `http://localhost:3000/guilds/test-guild-123/rank-card/TestUser`
2. **Expected**:
   - Loading screen appears immediately with shimmer animation
   - Rank card displays with user data
   - Level badge, XP bar, and stats are visible
   - Glass morphism design with gradient effects

### Test 2: Unicode Display Names
1. Create member with unicode name (e.g., "あずれ")
2. Navigate to: `http://localhost:3000/guilds/test-guild-123/rank-card/あずれ`
3. **Expected**:
   - Name is properly decoded and normalized
   - Rank card displays correctly

### Test 3: URL-Encoded Names
1. Navigate to: `http://localhost:3000/guilds/test-guild-123/rank-card/Azür%C3%A9`
2. **Expected**:
   - Special characters decoded properly
   - Lookup works with normalized key

### Test 4: Member Not Found
1. Navigate to: `http://localhost:3000/guilds/test-guild-123/rank-card/NonExistentUser`
2. **Expected**:
   - Loading screen appears briefly
   - "Member Not Found" error screen displays
   - Shows the searched display name

### Test 5: Ambiguous Match (Multiple Members)
1. Create two members with same normalized `displayNameKey`:
   - Member 1: `displayName: "TestUser"`, `displayNameKey: "testuser"`
   - Member 2: `displayName: "TESTUSER"`, `displayNameKey: "testuser"`
2. Navigate to: `http://localhost:3000/guilds/test-guild-123/rank-card/testuser`
3. **Expected**:
   - "Multiple Members Found" screen displays
   - Lists all matching members with IDs

### Test 6: Real-time Updates
1. Open rank card page for a test user
2. In Firestore Console, update the member's XP or level
3. **Expected**:
   - Rank card updates automatically (no page refresh)
   - XP progress bar animates smoothly
   - Level badge updates if level changed
   - Update appears within 1-2 seconds

### Test 7: API Endpoint Direct Call
```bash
curl -X POST http://localhost:3000/api/guilds/test-guild-123/rank-card/ensure \
  -H "Content-Type: application/json" \
  -d '{"displayNameOriginal": "TestUser"}'
```

**Expected Response (Found):**
```json
{
  "cardId": "abcd1234...",
  "status": "ready",
  "data": {
    "status": "ready",
    "displayNameOriginal": "TestUser",
    "displayNameKey": "testuser",
    "memberId": "member-id",
    "level": 5,
    "xp": 350,
    "xpToNext": 250,
    "rankName": "Warrior",
    "avatarUrl": "https://...",
    "updatedAt": "2024-01-13T..."
  }
}
```

**Expected Response (Not Found):**
```json
{
  "cardId": "xyz789...",
  "status": "not_found"
}
```

## Visual Testing Checklist

- [ ] Loading screen has shimmer animation
- [ ] Rank card has glass morphism effect
- [ ] Gradient mesh background visible
- [ ] Subtle noise texture overlay present
- [ ] Avatar displays or shows fallback initial
- [ ] Level badge styled with gradient
- [ ] XP progress bar has smooth animation
- [ ] Progress bar shows gradient fill
- [ ] Text is readable on dark background
- [ ] Responsive on mobile devices
- [ ] Error states have appropriate icons
- [ ] All states look polished and modern

## Troubleshooting

### "Firebase not initialized" error
- Check all `NEXT_PUBLIC_RANKCARD_FIREBASE_*` env vars are set
- Restart Next.js dev server after adding env vars

### "FIREBASE_SERVICE_ACCOUNT_JSON not set" error
- Verify service account JSON is properly formatted as single-line string
- Check for escaping issues in the JSON

### "Member not found" when member exists
- Verify `displayNameKey` field exists on member document
- Check that `displayNameKey` is normalized correctly
- Compare with exact `displayName` from Firestore

### Real-time updates not working
- Check browser console for Firestore errors
- Verify Firestore security rules allow read access to `rankCards`
- Ensure Firebase client config is correct

### API endpoint errors
- Check server logs for detailed error messages
- Verify service account has Firestore read/write permissions
- Test Firestore connection in Firebase Console

## Performance Expectations

- **Initial Load**: Loading screen appears instantly
- **API Response**: 1-2 seconds
- **Real-time Updates**: <1-2 seconds after Firestore change
- **No Page Refresh**: Required for updates

## Security Verification

- [ ] Firebase Admin credentials not exposed to client
- [ ] Members collection not readable from client
- [ ] Rank cards collection allows read but not write
- [ ] API endpoint validates all inputs
- [ ] No sensitive data in error messages

## Known Limitations

1. **XP Formula**: Uses `(level + 1) * 100`. Customize in API route if needed.
2. **Avatar Loading**: No specific loading state, may briefly show broken image
3. **Rate Limiting**: Not implemented yet
4. **Caching**: No caching implemented yet

For detailed setup documentation, see [RANK_CARD_SETUP.md](./RANK_CARD_SETUP.md).

