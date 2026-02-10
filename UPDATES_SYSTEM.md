# Update Notification System

## Overview

The Update Notification System provides a comprehensive way to track, display, and notify users about changes to the RHYTHMIA platform. It documents all Pull Requests from #104 onwards with detailed categorization and multi-language support.

## Features

### 1. Changelog Data Structure

Located in `src/lib/updates/changelog.ts`, the system maintains a comprehensive record of all PRs with:

- **PR number and title**
- **Category classification**: feature, enhancement, fix, refactor, docs, i18n
- **Merge date and status**
- **Description and highlights**
- **Helper functions** for filtering and statistics

### 2. Updates Panel Component

`src/components/main/UpdatesPanel.tsx` provides a rich UI for browsing updates:

- **Category filtering**: Filter by feature type with badge counters
- **Animated transitions**: Smooth animations with Framer Motion
- **Internationalization**: Full support for Japanese and English
- **External links**: Direct links to GitHub PRs
- **Responsive design**: Optimized for mobile and desktop

### 3. What's New Banner

`src/components/main/WhatsNewBanner.tsx` shows a dismissible banner for new updates:

- **Auto-show on new updates**: Appears when new PRs are merged
- **Local storage persistence**: Remembers dismissed updates
- **One-time notification**: Only shows once per update
- **Direct navigation**: Links to full updates page

### 4. Dedicated Updates Page

Located at `/[locale]/updates`, provides a dedicated view for browsing all updates:

- **Deep linking**: Shareable URL for specific update views
- **Extended list**: Shows up to 20 recent updates
- **SEO optimized**: Proper metadata for search engines

## Usage

### Displaying the Updates Panel

```tsx
import UpdatesPanel from '@/components/main/UpdatesPanel';

// Default usage (10 recent updates with category filtering)
<UpdatesPanel />

// Custom configuration
<UpdatesPanel maxItems={20} showCategories={true} />
```

### Integrating What's New Banner

```tsx
import WhatsNewBanner from '@/components/main/WhatsNewBanner';

// Auto-show banner (appears once per new update)
<WhatsNewBanner autoShow={true} dismissible={true} />
```

### Using the Changelog API

```typescript
import { 
  getRecentUpdates, 
  getUpdatesByCategory, 
  getUpdateStats,
  getUpdatesByDateRange 
} from '@/lib/updates';

// Get 10 most recent updates
const recent = getRecentUpdates(10);

// Get updates by category
const features = getUpdatesByCategory().get('feature');

// Get statistics
const stats = getUpdateStats();
// Returns: { total, merged, byCategory, dateRange }

// Get updates by date range
const updates = getUpdatesByDateRange('2026-02-07', '2026-02-10');
```

## Data Structure

### PRUpdate Interface

```typescript
interface PRUpdate {
  number: number;           // PR number
  title: string;            // PR title
  category: string;         // feature | enhancement | fix | refactor | docs | i18n
  date: string;             // YYYY-MM-DD format
  merged: boolean;          // Merge status
  description: string;      // Brief description
  highlights?: string[];    // Key features/changes
}
```

## Internationalization

All UI strings support Japanese and English via next-intl:

### Translation Keys (messages/*.json)

```json
{
  "updates": {
    "title": "Recent Updates",
    "recentUpdates": "Recent updates",
    "prsMerged": "PRs merged",
    "all": "All",
    "viewPR": "View PR",
    "viewAllPRs": "View all PRs",
    "categories": {
      "feature": "Features",
      "enhancement": "Enhancements",
      "fix": "Fixes",
      "refactor": "Refactors",
      "docs": "Documentation",
      "i18n": "Internationalization"
    }
  }
}
```

## Styling

### Category Colors

Each category has a unique color for visual distinction:

- **Feature** (✨): `#4ade80` (green)
- **Enhancement** (⚡): `#60a5fa` (blue)
- **Fix** (🐛): `#f87171` (red)
- **Refactor** (♻️): `#a78bfa` (purple)
- **Documentation** (📝): `#fbbf24` (yellow)
- **i18n** (🌍): `#34d399` (teal)

### CSS Modules

- `UpdatesPanel.module.css`: Main panel styling with glass-morphism effects
- `WhatsNewBanner.module.css`: Banner styling with backdrop blur

## Adding New Updates

To add a new update to the changelog:

1. Open `src/lib/updates/changelog.ts`
2. Add a new entry to the `PR_UPDATES` array:

```typescript
{
  number: 151,
  title: 'Your PR title',
  category: 'feature', // or enhancement, fix, etc.
  date: '2026-02-10',
  merged: true,
  description: 'Brief description of the changes',
  highlights: [
    'Key feature 1',
    'Key feature 2',
    'Key feature 3'
  ]
}
```

## Best Practices

1. **Keep descriptions concise**: Aim for 1-2 sentences that capture the essence
2. **Use highlights for details**: Break down complex changes into bullet points
3. **Choose categories wisely**: Use 'feature' for new functionality, 'enhancement' for improvements
4. **Update promptly**: Add entries as soon as PRs are merged
5. **Maintain chronological order**: Keep entries sorted by PR number

## Integration Points

### With Notification System

The update notification system is separate from the advancement notification system but uses similar patterns:

- Both use local storage for persistence
- Both support internationalization
- Both use Framer Motion for animations

### With Main App

The updates page is accessible via:
- Japanese: `https://azuretier.net/updates`
- English: `https://azuretier.net/en/updates`

## Statistics (as of PR #150)

- **Total PRs**: 47
- **Merged**: 37
- **Categories**:
  - Features: 15
  - Enhancements: 11
  - Fixes: 5
  - Refactors: 4
  - Documentation: 1
  - i18n: 2
- **Date Range**: 2026-02-07 to 2026-02-10

## Future Enhancements

Potential improvements:

1. **RSS feed**: Generate RSS/Atom feed for update subscriptions
2. **Email notifications**: Optional email alerts for new updates
3. **Search functionality**: Full-text search across updates
4. **Filtering by date**: Date range picker for historical browsing
5. **GitHub API integration**: Auto-fetch PR data from GitHub API
6. **Changelog export**: Export changelog as Markdown or JSON

## Related Files

- `src/lib/updates/changelog.ts` - Data and helper functions
- `src/lib/updates/index.ts` - Barrel export
- `src/components/main/UpdatesPanel.tsx` - Main panel component
- `src/components/main/UpdatesPanel.module.css` - Panel styles
- `src/components/main/WhatsNewBanner.tsx` - Banner component
- `src/components/main/WhatsNewBanner.module.css` - Banner styles
- `src/app/[locale]/updates/page.tsx` - Dedicated updates page
- `messages/ja.json` - Japanese translations
- `messages/en.json` - English translations
