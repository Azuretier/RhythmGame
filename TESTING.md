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
