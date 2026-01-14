# Railway Deployment Guide - Multiplayer Score Attack Game

This guide explains how to deploy the Score Attack multiplayer game on Railway for 24/7 operation.

## Prerequisites

1. A [Railway](https://railway.app) account (sign up for free)
2. Railway CLI installed (optional, but recommended)
3. Your GitHub repository connected to Railway

## Quick Deploy (Recommended)

### Option 1: Deploy via GitHub Integration

1. **Sign in to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign in with your GitHub account

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your `Azuret.me` repository
   - Railway will auto-detect your Node.js project

3. **Configure Environment Variables** (if needed)
   - Go to your project's Variables tab
   - Add any required environment variables from `.env.example`:
     ```
     NODE_ENV=production
     PORT=3000
     DISCORD_BOT_TOKEN=your_token
     DISCORD_CLIENT_ID=your_client_id
     DISCORD_CLIENT_SECRET=your_client_secret
     # ... add other variables as needed
     ```

4. **Deploy**
   - Railway will automatically:
     - Install dependencies (`npm install`)
     - Build the project (`npm run build`)
     - Start the server (`npm start`)
   - Your app will be live at a Railway-provided URL (e.g., `your-app.up.railway.app`)

5. **Get Your Public URL**
   - Click on "Settings" in your Railway project
   - Under "Domains", click "Generate Domain"
   - You'll get a URL like: `azuret.up.railway.app`
   - You can also add a custom domain if you have one

### Option 2: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize Railway in your project
cd /path/to/Azuret.me
railway init

# Deploy
railway up

# Open your deployed app
railway open
```

## Configuration Files

Railway uses the following configuration (already set in `package.json`):

```json
{
  "scripts": {
    "build": "next build",
    "start": "ts-node --project tsconfig.server.json server.ts"
  }
}
```

## Railway Configuration Details

### Automatic Detection

Railway automatically detects:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: From your `package.json` engines field (or latest LTS)

### Custom Configuration (Optional)

If you need custom configuration, create a `railway.json` file:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Or create a `nixpacks.toml` file:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

## Important Notes for 24/7 Operation

### 1. Health Checks & Monitoring

Railway keeps your app running 24/7 by default on paid plans. On the free tier:
- **Hobby Plan** (Free): 500 hours/month, sleeps after 20 minutes of inactivity
- **Developer Plan** ($5/month): No sleep, always online
- **Team Plan** ($20/month): Enhanced features

To prevent sleeping on free tier, you can:
- Use a cron job or uptime monitoring service (e.g., UptimeRobot, Cronitor)
- Make periodic requests to keep the server active

### 2. WebSocket Support

Railway fully supports WebSocket connections (Socket.IO), no additional configuration needed!

### 3. Environment Variables

Set these in Railway dashboard:
- `NODE_ENV=production` - Enables production optimizations
- `PORT` - Railway automatically sets this (don't override unless needed)

### 4. Logs & Monitoring

View logs in Railway dashboard:
```bash
# Via CLI
railway logs
```

Or in the web dashboard:
- Go to your project → Deployments → Click on deployment → View logs

### 5. Automatic Deploys

Railway automatically redeploys when you push to your GitHub repository:
- Main branch pushes trigger automatic deployments
- Preview deployments for pull requests (configurable)

### 6. Scaling

Railway automatically handles:
- **Vertical Scaling**: Allocates resources as needed
- **Horizontal Scaling**: Available on Team plans

## Cost Estimate

Railway pricing (as of 2024):
- **Hobby (Free)**: $5 credit/month, 500 execution hours, sleeps after inactivity
- **Developer ($5/month)**: $5 credit + usage, no sleep, always online
- **Team ($20/month)**: $20 credit + usage, team features

Your app should cost approximately **$5-10/month** on the Developer plan for 24/7 operation.

## Troubleshooting

### App Won't Start

1. **Check Logs**: Railway dashboard → Deployments → View logs
2. **Verify Build**: Ensure `npm run build` completes successfully
3. **Check Dependencies**: Make sure all dependencies are in `dependencies`, not `devDependencies`

### WebSocket Connection Issues

1. **Check CORS Settings**: Update `server.ts` to allow your Railway domain:
   ```typescript
   const io = new SocketIOServer(server, {
     cors: {
       origin: ['https://your-app.up.railway.app'],
       methods: ['GET', 'POST'],
     },
   });
   ```

2. **Use WSS Protocol**: Railway automatically handles HTTPS/WSS, ensure client connects to `wss://` not `ws://`

### Environment Variables

If Discord bot or Firebase features don't work:
1. Go to Railway dashboard → Variables
2. Add all variables from `.env.example`
3. Redeploy (Railway auto-redeploys on variable changes)

## Updating Your Deployment

### Automatic (Recommended)
Push to GitHub, Railway auto-deploys:
```bash
git add .
git commit -m "Update multiplayer game"
git push origin main
```

### Manual via CLI
```bash
railway up
```

## Custom Domain Setup

1. **In Railway Dashboard**:
   - Settings → Domains → "Custom Domain"
   - Enter your domain (e.g., `play.azuret.me`)

2. **In Your DNS Provider**:
   - Add CNAME record:
     - Name: `play` (or `@` for root domain)
     - Value: Your Railway domain (e.g., `your-app.up.railway.app`)
   - Wait for DNS propagation (5-30 minutes)

3. **Update CORS in `server.ts`**:
   ```typescript
   cors: {
     origin: ['https://play.azuret.me'],
     methods: ['GET', 'POST'],
   }
   ```

## Monitoring & Uptime

### Free Uptime Monitors
- **UptimeRobot**: Free tier monitors every 5 minutes
- **Cronitor**: Free tier for basic monitoring
- **Pingdom**: Limited free tier

Example UptimeRobot setup:
1. Add monitor: `https://your-app.up.railway.app/`
2. Check interval: 5 minutes
3. Alert when down

### Railway Observability
- Built-in metrics in dashboard
- CPU, Memory, Network usage graphs
- Deployment history

## Testing Your Deployment

1. **Get your Railway URL** from the dashboard
2. **Test the game**:
   - Visit `https://your-app.up.railway.app/play`
   - Create a room
   - Join from another device/browser
   - Verify real-time gameplay works

3. **Test WebSocket connection**:
   - Open browser DevTools → Console
   - Should see: "Connected to game server"

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **This Repo Issues**: https://github.com/Azuretier/Azuret.me/issues

## Summary

✅ **Quick Deploy**: Connect GitHub repo → Railway auto-configures → Add domain → Done!  
✅ **24/7 Uptime**: Developer plan ($5/month) keeps server always online  
✅ **WebSocket Support**: Socket.IO works out-of-the-box  
✅ **Auto-Deploy**: Push to GitHub, Railway deploys automatically  
✅ **Scaling**: Handles multiple concurrent players automatically  

Your multiplayer Score Attack game will be running 24/7 on Railway! 🎮
