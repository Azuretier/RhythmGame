# Discord Role Selection - UI Description

## Page: `/azure-supporter`

### Before Login View

**Layout:**
- Dark theme (gray-950 background)
- Centered card layout
- Maximum width: 512px

**Content:**
```
┌────────────────────────────────────────┐
│                                        │
│         Azure Supporter                │
│   Select your language role for        │
│            Discord                     │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │            🔗                     │ │
│  │                                   │ │
│  │      Connect Discord              │ │
│  │                                   │ │
│  │  Link your Discord account to     │ │
│  │  select your language role        │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  [Discord Icon]              │ │ │
│  │  │  Login with Discord          │ │ │
│  │  └─────────────────────────────┘ │ │
│  │     (Blue Discord button)         │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### After Login - Role Selection View

**Header:**
- Shows "Select Your Role"
- Displays username: "Logged in as [username]"
- Shows current role: "Current role: English" (if applicable)

**Role Selection Grid:**
```
┌────────────────────────────────────────┐
│                                        │
│       Select Your Role                 │
│   Logged in as: username               │
│   Current role: English                │
│                                        │
│  ┌──────────────┐  ┌──────────────┐  │
│  │              │  │              │  │
│  │      🇺🇸      │  │      🇯🇵      │  │
│  │              │  │              │  │
│  │   English    │  │    日本語     │  │
│  │              │  │              │  │
│  └──────────────┘  └──────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Confirm & Sync to Discord        │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Disconnect Discord                    │
│                                        │
└────────────────────────────────────────┘
```

### Visual States

#### 1. Unselected Role Button
- Border: Gray-800 (2px)
- Background: Gray-900
- Text: White
- Hover: Border changes to Gray-700

#### 2. Selected Role Button
- Border: Transparent
- Background: Gradient (Blue for EN, Red for JP)
- Scale: 105% (slightly larger)
- Shadow: Large shadow effect

#### 3. Confirm Button States

**Disabled (no selection):**
- Background: Gray-800
- Text: Gray-600
- Cursor: Not allowed

**Enabled:**
- Background: Gradient matching selected role
- Text: White
- Hover: Slight opacity change

**Loading:**
- Text: "Syncing..."
- Disabled state

**Success:**
- Text: "✓ Role Assigned!"
- Green checkmark icon

#### 4. Current Role Already Selected
- Button text: "Already Assigned"
- Disabled state

### Color Schemes

**EN (English):**
- Gradient: Blue-500 to Indigo-600
- Flag: 🇺🇸
- Accent: Blue

**JP (Japanese):**
- Gradient: Red-500 to Pink-600
- Flag: 🇯🇵
- Accent: Red

### Error/Success Messages

**Error Message Box:**
- Background: Red-900 with 20% opacity
- Border: Red-500
- Text: Red-400
- Padding: 1rem
- Rounded corners

**Success Message Box:**
- Background: Green-900 with 20% opacity
- Border: Green-500
- Text: Green-400
- Padding: 1rem
- Rounded corners

### Loading States

1. **Initial Load (Fetching Current Role):**
   - Shows: "Loading current role..."
   - Text: Gray-400
   - Center aligned

2. **Role Assignment in Progress:**
   - Button text: "Syncing..."
   - All buttons disabled
   - Opacity: 50%

### Responsive Design
- Mobile: Full width with padding
- Desktop: Centered with max-width constraint
- Grid: 2 columns for role buttons
- All elements stack vertically on mobile

### Accessibility
- Semantic HTML buttons
- Clear visual feedback for all states
- Keyboard navigation support
- Color contrasts meet WCAG standards
- Loading states announced to screen readers
