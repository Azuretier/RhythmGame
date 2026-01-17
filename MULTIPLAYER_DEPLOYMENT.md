# WebSocket Multiplayer Server Deployment Guide

This guide covers deploying the WebSocket multiplayer server to Railway and connecting it to a Vercel-hosted frontend.

## Architecture

The multiplayer system uses a separated architecture:

- **Frontend (Next.js)**: Deployed to Vercel
- **WebSocket Server**: Deployed to Railway
- **Communication**: Frontend connects via `NEXT_PUBLIC_MULTIPLAYER_URL`

## Prerequisites

- A [Railway account](https://railway.app)
- A [Vercel account](https://vercel.com)
- Your GitHub repository connected to both platforms

## Deploying to Railway

### Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `Azuret.me` repository
5. Railway will detect your project

### Step 2: Configure Start Command

1. In your Railway project settings, go to "Settings" → "Deploy"
2. Set the **Start Command** to:
   ```
   npm run multiplayer
   ```
3. Set the **Build Command** (if needed):
   ```
   npm install
   ```

### Step 3: Configure Environment Variables

In Railway project settings, go to "Variables" and add:

```env
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

**Note**: Railway automatically sets the `PORT` environment variable. Do not set it manually.

### Step 4: Deploy

1. Railway will automatically deploy your project
2. Wait for the deployment to complete
3. Click on your deployment to see the logs
4. Note your Railway URL (e.g., `your-app.railway.app`)

### Step 5: Get Your WebSocket URL

Your WebSocket URL will be:
```
wss://your-app.railway.app
```

**Important**: Use `wss://` (secure WebSocket) in production, not `ws://`

## Deploying Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your `Azuret.me` repository
4. Vercel will detect Next.js automatically

### Step 2: Configure Environment Variables

In Vercel project settings, go to "Settings" → "Environment Variables" and add:

```env
NEXT_PUBLIC_MULTIPLAYER_URL=wss://your-railway-app.railway.app
```

Replace `your-railway-app.railway.app` with your actual Railway URL.

### Step 3: Deploy

1. Click "Deploy"
2. Wait for the deployment to complete
3. Note your Vercel URL (e.g., `your-app.vercel.app`)

### Step 4: Update Railway Origins

Go back to Railway and update the `ALLOWED_ORIGINS` variable:

```env
ALLOWED_ORIGINS=https://your-app.vercel.app
```

This ensures only your Vercel frontend can connect to your WebSocket server.

## Local Development

### Start WebSocket Server

In one terminal:
```bash
npm run multiplayer
```

Server runs on `ws://localhost:3001`

### Start Next.js

Create `.env.local`:
```env
NEXT_PUBLIC_MULTIPLAYER_URL=ws://localhost:3001
```

In another terminal:
```bash
npm run dev
```

Visit `http://localhost:3000/play` to test.

## Troubleshooting

### WebSocket Connection Fails

1. Check Railway logs for errors
2. Verify `ALLOWED_ORIGINS` includes your Vercel URL
3. Ensure you're using `wss://` (not `ws://`) in production
4. Check browser console for CORS errors

### Railway Deployment Fails

1. Check Railway logs
2. Verify `package.json` has `"multiplayer"` script
3. Ensure `ws` package is in `dependencies` (not `devDependencies`)

### Origin Validation Error

If you see "Rejected connection from origin" in Railway logs:

1. Update `ALLOWED_ORIGINS` to include the connecting domain
2. Use comma-separated list for multiple domains
3. Redeploy Railway project

### Room Codes Not Working

1. Check if WebSocket is connected (look for green status indicator)
2. Verify room code is 6 uppercase characters
3. Check Railway logs for room creation messages

## Monitoring

### Railway Logs

View real-time logs:
1. Go to Railway project
2. Click on your service
3. Click "Logs" tab

Look for:
- `WebSocket multiplayer server running on 0.0.0.0:XXXX`
- `Player XXX connected from XXX`
- `Room XXXXXX created by XXX`

### Health Check

Railway URL + `/health` endpoint:
```bash
curl https://your-app.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":1234567890}
```

## Advanced Configuration

### Custom Domain

1. In Railway, go to "Settings" → "Domains"
2. Add your custom domain
3. Update Vercel's `NEXT_PUBLIC_MULTIPLAYER_URL` to use your domain
4. Update Railway's `ALLOWED_ORIGINS` to include your custom domain

### Multiple Environments

For staging/production:

**Railway (Staging)**
```env
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

**Railway (Production)**
```env
ALLOWED_ORIGINS=https://yourdomain.com
```

### Scaling Considerations

Current implementation uses in-memory storage (single instance):
- Suitable for small to medium traffic
- All rooms on one server
- Automatic host migration
- No Redis/database required

For scaling to multiple instances, you would need:
- Redis for shared room state
- Redis Pub/Sub for message broadcasting
- Session affinity or connection routing

## Security Notes

1. **Origin Validation**: Always set `ALLOWED_ORIGINS` to your actual domains
2. **Use WSS**: Always use `wss://` in production for encrypted connections
3. **Rate Limiting**: Built-in but consider adding more layers
4. **Input Validation**: Room codes and messages are validated server-side

## Support

If you encounter issues:

1. Check Railway logs for error messages
2. Verify environment variables are set correctly
3. Test locally first to isolate issues
4. Check browser console for client-side errors

## Tick-Based Input Protocol

The multiplayer system now uses a server-authoritative, tick-based input protocol for gameplay synchronization.

### Architecture Overview

- **Server**: Runs a fixed tick loop (100ms per tick = 10 ticks/second)
- **Clients**: Send input actions (move, rotate, drop) with tick numbers
- **Server**: Collects inputs from all players and broadcasts authoritative `tick_inputs` messages
- **Clients**: Apply inputs locally immediately for responsiveness, receive server broadcasts for opponent state

### Message Flow

1. **Game Start**: Host starts game → Server creates `GameSessionManager` → Tick loop begins
2. **Player Input**: Client action (e.g., move left) → Client sends `input` message with current tick
3. **Server Processing**: Server collects inputs for current tick → Broadcasts `tick_inputs` with all player inputs
4. **Client Update**: Client receives `tick_inputs` → Updates opponent visualization

### Input Validation

The server validates inputs to prevent cheating:
- **Past Tick Rejection**: Inputs for already-processed ticks are ignored
- **Future Tick Limit**: Inputs more than 5 ticks ahead are rejected
- **Action Limit**: Maximum 10 actions per player per tick
- **Player Validation**: Only valid room members can submit inputs

### Reconnection & Resync

On reconnect:
1. Client sends `game_resync_request`
2. Server responds with `game_resync` containing:
   - Current tick number
   - Recent tick history (last 100 ticks)
3. Client updates local tick counter

### Backward Compatibility

The system maintains backward compatibility:
- Old `relay` messages still work for state sync fallback
- Clients can use mixed protocol during transition
- Server supports both input-based and relay-based gameplay

### Configuration

Tick system settings in `multiplayer-server.ts`:
```typescript
const TICK_RATE = 100; // ms per tick
const MAX_TICK_HISTORY = 100; // Ticks kept for resync
const MAX_FUTURE_TICKS = 5; // Max ticks ahead for input
const MAX_ACTIONS_PER_TICK = 10; // Action limit per player
```

### Input Actions

Supported action types:
- `{ type: 'move', direction: 'left' | 'right' | 'down' }`
- `{ type: 'rotate' }`
- `{ type: 'hard_drop' }`

### Future Improvements

The current implementation provides:
- ✅ Server-authoritative tick management
- ✅ Input validation and rate limiting
- ✅ Reconnect support with history replay
- ✅ Simultaneous player input handling

Future enhancements:
- 🔄 Full deterministic simulation (requires game logic refactor)
- 🔄 Client-side prediction with rollback
- 🔄 Input buffering for network jitter
- 🔄 Replay system using tick history

## Next Steps

After successful deployment:

1. Test room creation and joining
2. Test with multiple players
3. Verify ready/start flow works
4. Test disconnection handling
5. Implement your game logic using the relay system

## Example URLs

- **Railway WebSocket**: `wss://azuret-multiplayer.railway.app`
- **Vercel Frontend**: `https://azuret-me.vercel.app`
- **Play Page**: `https://azuret-me.vercel.app/play`
- **Health Check**: `https://azuret-multiplayer.railway.app/health`
