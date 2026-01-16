# Rhythmia TSX Implementation

This directory contains the Next.js TSX implementation of the Rhythmia game launcher and games.

## Overview

The Rhythmia page has been converted from a single HTML file (`public/rhythmia-nexus.html`) with embedded JavaScript into a proper Next.js/React implementation using TypeScript and modular components.

## Architecture

### Main Components

- **`page.tsx`**: Main lobby/launcher page with server selection
- **`components/VanillaGame.tsx`**: Single-player Tetris-like rhythm game
- **`components/MultiplayerGame.tsx`**: Online multiplayer battle mode with Firebase integration
- **`components/LifeJourney.tsx`**: Interactive story experience (7 chapters)

### Supporting Files

- **`rhythmia.module.css`**: Shared styles for the main lobby page
- **`/src/lib/rhythmia/firebase.ts`**: Firebase configuration for multiplayer features

## Firebase Configuration

The multiplayer mode uses Firebase Firestore for room management and Firebase Auth for user identification. To configure:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable Firestore Database
4. Enable Authentication (Anonymous sign-in method recommended)

### 2. Get Your Configuration

1. In Firebase Console, go to Project Settings
2. Scroll to "Your apps" section
3. Click "Add app" → Web (</>) icon
4. Copy the Firebase configuration values

### 3. Set Environment Variables

Add these to your `.env.local` file (or deployment environment):

```bash
NEXT_PUBLIC_RHYTHMIA_FIREBASE_API_KEY='your-api-key-here'
NEXT_PUBLIC_RHYTHMIA_FIREBASE_AUTH_DOMAIN='your-project.firebaseapp.com'
NEXT_PUBLIC_RHYTHMIA_FIREBASE_PROJECT_ID='your-project-id'
NEXT_PUBLIC_RHYTHMIA_FIREBASE_STORAGE_BUCKET='your-project.appspot.com'
NEXT_PUBLIC_RHYTHMIA_FIREBASE_MESSAGING_SENDER_ID='your-sender-id'
NEXT_PUBLIC_RHYTHMIA_FIREBASE_APP_ID='your-app-id'
```

### 4. Firestore Security Rules

Set up Firestore security rules to allow authenticated users to read/write rooms:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rhythmia_rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null 
        && resource.data.hostId == request.auth.uid;
    }
  }
}
```

## WebSocket Configuration

The multiplayer mode also uses a WebSocket server for real-time game synchronization. Configure the WebSocket URL:

```bash
NEXT_PUBLIC_MULTIPLAYER_URL='wss://your-multiplayer-server.example.com'
```

For local development:
```bash
NEXT_PUBLIC_MULTIPLAYER_URL='ws://localhost:3001'
```

## Features

### Lobby (Main Page)
- Server selection interface
- Three game modes: Vanilla, Multiplayer, Modded
- Animated background effects
- Online player count indicator
- Loading state management

### Vanilla Mode
- Single-player Tetris-like rhythm game
- 5 worlds with increasing BPM
- Beat-based mechanics
- Combo system
- Enemy boss battles

### Multiplayer Mode
- Online lobby system
- Room creation with public/private options
- Real-time 1v1 battles
- Garbage attack system
- Firebase room management
- WebSocket synchronization

### Modded (Life Journey)
- 7 interactive chapters
- Beautiful transitions and animations
- Responsive design
- Fully self-contained story experience

## Development

### Run Locally

```bash
npm run dev
```

Navigate to `http://localhost:3000/play/rhythmia`

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Key Changes from HTML Version

1. **No More Template Literals**: Game HTML/JS moved to proper React components
2. **Type Safety**: Full TypeScript implementation with strict types
3. **State Management**: React hooks replace global variables
4. **Client-Side Only**: Proper `'use client'` directives
5. **Modular CSS**: CSS modules replace inline styles
6. **No dangerouslySetInnerHTML**: Clean React rendering
7. **Firebase Integration**: Proper npm package usage instead of CDN scripts
8. **Error Handling**: React-based error states replace alert() calls

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Performance

- Initial load optimized with code splitting
- Lazy loading for game components
- Efficient re-renders with React.memo
- Canvas-based rendering for games

## Troubleshooting

### "INITIALIZING..." Stuck

This was the original issue with the HTML version. The TSX version fixes this by:
- Proper loading state management with React state
- No syntax errors from template literal embedding
- Reliable useEffect cleanup

### Firebase Connection Errors

1. Check that all environment variables are set correctly
2. Verify Firebase project configuration in Firebase Console
3. Check browser console for detailed error messages
4. Ensure Firestore rules allow your operations

### WebSocket Connection Fails

1. Verify `NEXT_PUBLIC_MULTIPLAYER_URL` is correctly set
2. Check that multiplayer server is running
3. Ensure CORS is configured on the WebSocket server
4. Check browser console for WebSocket error details

## Future Enhancements

Potential improvements:
- [ ] Add leaderboard system
- [ ] Implement tournament mode
- [ ] Add more game variants
- [ ] Improve AI opponent
- [ ] Add replay system
- [ ] Add spectator mode
- [ ] Implement matchmaking

## License

Part of the Azuret.me project.
