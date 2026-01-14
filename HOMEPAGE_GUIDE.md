# Interactive Homepage Guide

## Overview

The interactive homepage at `/` features a GPU-rendered atmospheric background with a Discord-like messenger UI for social media navigation.

## Features

- **GPU-Accelerated Background**: WebGL shader rendering with atmospheric effects, city silhouettes, and fog
- **Loading Screen**: Smooth animated loading experience with progress indicators
- **Discord-like Messenger UI**: Chat interface where you can interact with Azur
- **Intent Router**: Type messages to find social media links (X, YouTube, Discord, GitHub, Instagram)

## Customizing Social Links

Edit `/src/lib/intent/parser.ts` to customize your social media links:

```typescript
const destinations = {
  x: {
    name: "X (Twitter)",
    url: "https://x.com/your_username",
    icon: "𝕏",
    keywords: ["x", "twitter", "tweet", "tweets", "𝕏"],
  },
  youtube: {
    name: "YouTube",
    url: "https://www.youtube.com/@your_channel",
    icon: "▶",
    keywords: ["youtube", "video", "videos", "channel", "watch", "yt"],
  },
  discord: {
    name: "Discord",
    url: "https://discord.gg/your_invite",
    icon: "💬",
    keywords: ["discord", "server", "chat", "community", "join"],
  },
  github: {
    name: "GitHub",
    url: "https://github.com/your_username",
    icon: "💻",
    keywords: ["github", "code", "repository", "repo", "git"],
  },
  instagram: {
    name: "Instagram",
    url: "https://www.instagram.com/your_username",
    icon: "📸",
    keywords: ["instagram", "insta", "ig", "photo", "pictures"],
  },
};
```

## GPU Rendering

### WebGL Support

**Browser Support:**
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS, Android)
- WebGL 2.0 preferred, WebGL 1.0 fallback

**Features:**
- Atmospheric gradient background
- Procedural building silhouettes
- Animated fog layers
- Time-based lighting effects
- Optimized for 60fps

**Shader Location:** `/public/shaders/atmosphere.frag`

### Fallback Behavior

If WebGL is unavailable, the system falls back to a static CSS gradient background. The messenger UI remains fully functional.

## File Structure

```
src/
├── components/home/
│   ├── InteractiveHomepage.tsx    # Main component
│   ├── WebGLBackground.tsx        # WebGL renderer
│   ├── LoadingScreen.tsx          # Loading screen overlay
│   ├── MessengerUI.tsx            # Discord-like chat interface
│   └── ResponseCard.tsx           # Animated navigation card
├── lib/intent/
│   └── parser.ts                  # Intent parsing logic
public/shaders/
└── atmosphere.frag                # WebGL shader
```

## Customizing the UI

### Changing Owner Name/Message

Edit `/src/components/home/MessengerUI.tsx`:

```typescript
const [messages, setMessages] = useState<Message[]>([
  {
    id: "1",
    author: "Azur",
    content: "Hey there! 👋 I'm Azur. Feel free to ask me where you can find me online!",
    timestamp: new Date(),
    isOwner: true,
  },
]);
```

### Modifying Shader Effects

**WebGL Shader:** Edit `/public/shaders/atmosphere.frag`
- Adjust colors in the `skyGradient` section
- Modify `buildingSilhouette` function for different architecture
- Change fog parameters in the fog calculation section

### Styling

The UI uses TailwindCSS. Colors and styles can be modified directly in the component files:
- Discord theme colors: `bg-[#313338]`, `bg-[#2b2d31]`, etc.
- Adjust in `MessengerUI.tsx` for consistent theming

## Intent Keywords

The intent router recognizes these keywords (edit in `/src/lib/intent/parser.ts`):

- **X/Twitter**: "x", "twitter", "tweet", "tweets", "𝕏"
- **YouTube**: "youtube", "video", "videos", "channel", "watch", "yt"
- **Discord**: "discord", "server", "chat", "community", "join"
- **GitHub**: "github", "code", "repository", "repo", "git"
- **Instagram**: "instagram", "insta", "ig", "photo", "pictures"

## Technical Notes

- All GPU components are client-side only (`"use client"` directive)
- Dynamic imports with `ssr: false` prevent SSR issues
- Animation library: Framer Motion
- TypeScript strict mode compatible
- Three.js used for WebGL rendering

## Testing

**Desktop:**
1. Open in Chrome/Edge/Firefox/Safari
2. Check console for WebGL messages
3. Verify shader rendering and loading screen

**Mobile:**
1. Open on iOS/Android device
2. Check console for WebGL messages
3. Verify shader rendering works

**Fallback:**
1. Disable WebGL in browser settings (or use old browser)
2. Should see static gradient background
3. Messenger UI should still work

## Performance Considerations

- Shaders are optimized for 60fps on most devices
- WebGL renderer uses `high-performance` power preference
- Pixel ratio capped at 2x for mobile performance
- Minimal CPU overhead with GPU acceleration

## Development

### Local Testing

```bash
npm run dev
# Visit http://localhost:3000
```

### Adding New Social Platforms

1. Add entry to `destinations` object in `/src/lib/intent/parser.ts`
2. Define name, URL, icon, and keywords
3. The intent parser will automatically handle it

Example:

```typescript
linkedin: {
  name: "LinkedIn",
  url: "https://linkedin.com/in/your-profile",
  icon: "💼",
  keywords: ["linkedin", "professional", "career", "work"],
},
```

### Customizing Colors

Edit gradient classes in components:
- `from-blue-600 via-purple-600 to-pink-600` (generic gradient)
- `from-red-600 via-red-700 to-black` (YouTube)
- `from-indigo-600 via-purple-600 to-pink-600` (Discord)
- etc.

## Deployment

Works with standard Next.js deployment:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted with Node.js

Shader files in `/public/shaders/` are automatically included in the build.

## Troubleshooting

### Shader Not Loading
- Check `/public/shaders/atmosphere.frag` exists
- Verify file path in `WebGLBackground.tsx`
- Check browser console for fetch errors

### WebGL Not Working
- Verify browser supports WebGL
- Check for WebGL context creation errors in console
- Try different browser

### Performance Issues
- Reduce shader complexity in `.frag` file
- Lower `setPixelRatio` value in `WebGLBackground.tsx`
- Consider disabling animation effects

### Intent Not Recognized
- Check keywords in `parser.ts` include your search term
- Keywords are case-insensitive
- Use `.includes()` for partial matching
