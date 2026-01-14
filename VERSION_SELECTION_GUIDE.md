# UI Version Selection System

## Overview

The UI Version Selection System allows users to choose between different interface experiences on first visit and switch between them at any time.

## Available Versions

### v1.0.0 - Discord UI
- **Description**: Discord-like messenger interface with social navigation
- **Features**:
  - GPU-accelerated WebGL background with atmospheric effects
  - Discord-style chat interface
  - Intent-based routing to social media platforms
  - Real-time message display

### v1.0.1 - Patreon UI
- **Description**: Patreon-style creator layout with profile and content feed
- **Features**:
  - Profile card with avatar and stats
  - Content feed with posts
  - Social media links sidebar
  - Modern glassmorphic design

## User Flow

### First Visit
1. User visits the homepage
2. Loading screen displays with GPU-rendered background
3. Version selector modal appears after loading completes
4. User selects their preferred UI version (v1.0.0 or v1.0.1)
5. Selected version is saved to localStorage and cookies
6. User sees their chosen UI

### Returning Visit
1. User visits the homepage
2. Loading screen displays
3. Saved version is automatically loaded
4. No version selector shown

### Changing Versions
1. User clicks the floating settings button (bottom-right corner)
2. Version switcher modal/drawer opens
3. User selects a different version
4. Page reloads with new version

## Technical Implementation

### Storage
- **localStorage**: Primary storage for client-side persistence
- **Cookies**: Fallback and SSR support
- **Key**: `azuret_app_version`
- **Values**: `'1.0.0'` or `'1.0.1'`

### Components

#### Version Management (`src/lib/version/`)
- `types.ts`: Version type definitions and metadata
- `storage.ts`: localStorage and cookie management utilities
- `index.ts`: Public API exports

#### UI Components (`src/components/version/`)
- `VersionSelector.tsx`: Initial selection modal with animated cards
- `VersionSwitcher.tsx`: Floating action button and version switcher modal/drawer

#### Version UIs (`src/components/home/`)
- `v1.0.0/V1_0_0_UI.tsx`: Discord UI wrapper (wraps MessengerUI)
- `v1.0.1/V1_0_1_UI.tsx`: Patreon UI implementation

### Integration Point
The `InteractiveHomepage` component (`src/components/home/InteractiveHomepage.tsx`) orchestrates the version selection flow:
1. Checks for saved version on mount
2. Shows loading screen
3. Shows version selector if no saved version exists
4. Renders appropriate UI based on selected version
5. Displays version switcher button for changing versions

## Customization

### Adding a New Version

1. **Define the version in `src/lib/version/types.ts`**:
```typescript
export const UI_VERSIONS = ['1.0.0', '1.0.1', '1.0.2'] as const;

export const VERSION_METADATA: Record<UIVersion, UIVersionMetadata> = {
  // ...existing versions
  '1.0.2': {
    version: '1.0.2',
    name: 'Your UI Name',
    description: 'Your UI description',
  },
};
```

2. **Create UI component** in `src/components/home/v1.0.2/`:
```tsx
export default function V1_0_2_UI() {
  return (
    <div>
      {/* Your UI implementation */}
    </div>
  );
}
```

3. **Update InteractiveHomepage** to render the new version:
```tsx
import V1_0_2_UI from './v1.0.2/V1_0_2_UI';

const renderVersionUI = () => {
  switch (selectedVersion) {
    case '1.0.0':
      return <V1_0_0_UI />;
    case '1.0.1':
      return <V1_0_1_UI />;
    case '1.0.2':
      return <V1_0_2_UI />;
    default:
      return null;
  }
};
```

4. **Update version selector icons** in `VersionSelector.tsx`:
```tsx
const getIcon = (version: UIVersion) => {
  switch (version) {
    case '1.0.0':
      return <MessageCircle className="w-12 h-12" />;
    case '1.0.1':
      return <Heart className="w-12 h-12" />;
    case '1.0.2':
      return <YourIcon className="w-12 h-12" />;
  }
};
```

### Modifying Existing Versions

Edit the corresponding UI component file:
- **v1.0.0**: `src/components/home/v1.0.0/V1_0_0_UI.tsx`
- **v1.0.1**: `src/components/home/v1.0.1/V1_0_1_UI.tsx`

## Styling

All version UIs use:
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Glassmorphism** design pattern with gradients
- **Lucide React** and **React Icons** for icons

## Browser Support

- **localStorage**: Modern browsers (IE11+)
- **Cookies**: All browsers
- **Framer Motion**: Modern browsers with ES6 support

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management for modals
- Screen reader friendly

## Performance

- Version selection state managed with React hooks
- Minimal re-renders with proper state management
- Lazy loading of UI components where possible
- GPU-accelerated animations with Framer Motion

## Troubleshooting

### Version Not Saving
- Check browser localStorage is enabled
- Check cookies are not blocked
- Check console for storage errors

### Version Selector Not Showing
- Clear localStorage: `localStorage.removeItem('azuret_app_version')`
- Clear cookies in browser settings
- Hard refresh the page (Ctrl+Shift+R)

### UI Not Rendering Correctly
- Check browser console for errors
- Verify all dependencies are installed: `npm install`
- Rebuild the project: `npm run build`
- Check that all required assets exist (shaders, images, etc.)

## Development

### Testing Locally
```bash
# Run development server
npm run dev

# Open browser to http://localhost:3000

# Test version selection:
# 1. Clear localStorage in DevTools
# 2. Refresh page
# 3. Version selector should appear
```

### Building for Production
```bash
npm run build
npm start
```

## Future Enhancements

- [ ] Add more UI versions
- [ ] Add version preview before selection
- [ ] Add transition animations between versions
- [ ] Add user preferences per version
- [ ] Add analytics tracking for version usage
- [ ] Add A/B testing support
- [ ] Add server-side version selection based on user agent
