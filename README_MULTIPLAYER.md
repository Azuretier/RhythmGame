# Multiplayer Setup Guide 🎮

## Quick Start Instructions 🚀
To start the multiplayer server, run:
```bash
npm run multiplayer
```

The server will start on port 3001 by default (configurable via `PORT` environment variable).

## Environment Variables 🌍
Set the following environment variables for the server configuration:
- `PORT`: The port on which the server will run (default: 3001)
- `HOST`: The host address to bind to (default: 0.0.0.0)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS (default: http://localhost:3000,http://localhost:3001,null,file://)
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Optional Firebase service account JSON for room persistence

Example `.env` file:
```
PORT=3001
HOST=0.0.0.0
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000
```

## Gameplay Controls 🎹
- **Arrow Left/Right**: Move the piece horizontally
- **Arrow Down**: Soft drop (move piece down faster)
- **Arrow Up**: Rotate piece clockwise
- **Spacebar**: Hard drop (instantly drop piece to the bottom)

## Gameplay Mechanics ⚙️

### Beat System (120 BPM)
The game operates at **120 beats per minute** (BPM). Clearing lines on the beat provides bonus rewards:
- **On-beat clear**: 2x score multiplier + combo increase
- **Off-beat clear**: Normal score, combo resets to 0

### Scoring System
Base points per line clear:
- **1 Line**: 100 points
- **2 Lines**: 300 points  
- **3 Lines**: 500 points
- **4 Lines (Tetris)**: 800 points

**Multipliers:**
- On-beat clear: **2x multiplier**
- Combo multiplier: Score × max(1, current combo)

**Example:** A 4-line clear on beat with 5 combo = 800 × 2 × 5 = **8,000 points**

### Combo System
- Combos increase by +1 for each consecutive on-beat clear
- Combo resets to 0 when clearing off-beat or missing a beat
- Combo ≥ 2: Displays "X COMBO!" on screen
- Combo ≥ 5: Larger combo display with enhanced effects
- Every 3 combo adds +1 bonus garbage line to send

### Garbage Line System
Garbage lines are sent to the opponent based on line clears:
- **1 Line**: 0 garbage lines
- **2 Lines**: 1 garbage line
- **3 Lines**: 2 garbage lines
- **4 Lines**: 4 garbage lines
- **Bonus**: +1 garbage line per 3 combo (e.g., 6 combo = +2 lines)

Garbage lines appear at the bottom of the opponent's board with a single random gap.

## Technical Architecture 🏗️

### Frontend Components
- **MultiplayerGame.tsx** (`src/components/rhythmia/MultiplayerGame.tsx`)
  - Handles lobby and room management
  - Firebase authentication (anonymous sign-in)
  - Room creation, joining, and browsing
  - Player ready status and game start coordination
  - Firestore integration for room persistence

- **MultiplayerBattle.tsx** (`src/components/rhythmia/MultiplayerBattle.tsx`)
  - Core game engine with 10×18 grid
  - WebSocket communication for real-time gameplay
  - Piece movement, rotation, and collision detection
  - Beat synchronization and rhythm mechanics
  - Garbage line sending/receiving
  - Opponent board mirroring
  - Game over detection and winner announcement

### Backend Server
- **multiplayer-server.ts** (`multiplayer-server.ts`)
  - WebSocket relay server using `ws` library
  - HTTP health and stats endpoints
  - Room state management via RoomManager
  - Player connection tracking with heartbeat/ping-pong
  - Reconnection support with grace period (60s)
  - Optional Firestore integration for room persistence
  - Graceful shutdown handling

### Communication Protocol
Messages are exchanged via WebSocket in JSON format:
- **Client → Server**: `create_room`, `join_room`, `leave_room`, `set_ready`, `start_game`, `relay`, `get_rooms`
- **Server → Client**: `room_created`, `joined_room`, `player_joined`, `player_left`, `game_started`, `relayed`, `room_state`
- **Game Events**: Relayed messages include board updates, garbage attacks, score changes, and game over events

## Production Deployment Options 🌐

### Railway
1. Install Railway CLI: `npm i -g @railway/cli`
2. Initialize: `railway init`
3. Configure environment variables in Railway dashboard
4. Deploy: `railway up`
5. Railway automatically detects `multiplayer-server.ts` and runs it

### Render
1. Create new Web Service in Render dashboard
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm run multiplayer`
5. Add environment variables
6. Deploy and use provided `wss://` URL

### Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Initialize: `fly launch`
3. Configure `fly.toml` with WebSocket settings
4. Set secrets: `fly secrets set PORT=3001`
5. Deploy: `fly deploy`

### VPS (DigitalOcean, AWS, etc.)
1. Install Node.js 18+ on your VPS
2. Clone repository and install dependencies
3. Set up environment variables
4. Use PM2 for process management: `pm2 start npm --name "rhythmia-multiplayer" -- run multiplayer`
5. Configure nginx as reverse proxy with WebSocket support
6. Set up SSL certificate (Let's Encrypt)

**Important:** Always use `wss://` (WebSocket Secure) protocol in production for encrypted connections.

## Troubleshooting 🔧

### Connection Issues
**Problem:** Cannot connect to multiplayer server

**Solutions:**
1. Verify server is running: Check `/health` endpoint returns `{"status":"ok"}`
2. Check firewall rules: Ensure port 3001 (or your PORT) is open
3. Verify WebSocket URL: Must be `ws://` for local, `wss://` for production
4. Check browser console for WebSocket errors
5. Confirm ALLOWED_ORIGINS includes your frontend domain

### Authentication Issues
**Problem:** Authentication failed or stuck at "connecting"

**Solutions:**
1. Check Firebase configuration in `src/lib/rhythmia/firebase.ts`
2. Ensure Firebase project has Anonymous Authentication enabled
3. Verify Firebase API keys are correct in environment variables
4. Clear browser cache and cookies
5. Check browser console for Firebase errors

### Gameplay Sync Issues
**Problem:** Opponent board not updating or lag

**Solutions:**
1. Check network latency: Use `/stats` endpoint to monitor connections
2. Verify both players have stable connections
3. Try reconnecting: Leave room and rejoin
4. Check server logs for relay errors
5. Ensure heartbeat/ping-pong is working (check server logs)

### Room Not Found
**Problem:** Cannot join room with code

**Solutions:**
1. Verify room code is correct (case-sensitive)
2. Check room hasn't been closed (host disconnected > 60s)
3. Ensure Firestore integration is working if enabled
4. Try refreshing the room list
5. Create a new room if issue persists

## Monitoring 📊

### Health Check Endpoint
```bash
curl http://localhost:3001/health
```
Returns:
```json
{
  "status": "ok",
  "timestamp": 1706234567890,
  "connections": 4,
  "rooms": 2
}
```

### Stats Endpoint
```bash
curl http://localhost:3001/stats
```
Returns:
```json
{
  "connections": 4,
  "rooms": 2,
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  }
}
```

### Server Logs
The multiplayer server logs important events:
- `[CONNECT]` - New player connection
- `[DISCONNECT]` - Player disconnection
- `[ROOM]` - Room created
- `[JOIN]` - Player joined room
- `[LEAVE]` - Player left room
- `[GAME]` - Game started
- `[TIMEOUT]` - Connection timeout
- `[ERROR]` - Server errors

Monitor these logs for debugging and performance analysis.

## Future Enhancements 💡
- **Spectator Mode**: Allow non-participants to watch ongoing battles
- **Tournament System**: Organize bracket-style competitive tournaments
- **Replay System**: Record and playback game sessions
- **Custom Room Settings**: Adjustable game speed, board size, piece sets
- **Ranked Matchmaking**: ELO-based skill rating system
- **Team Battles**: 2v2 or larger team-based gameplay
- **Power-ups**: Special abilities and temporary buffs
- **Leaderboards**: Global and daily rankings
- **Voice Chat**: In-game communication
- **Mobile Support**: Touch controls for mobile devices