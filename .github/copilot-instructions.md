# Copilot Instructions for PivotLog

## Project Overview

PivotLog is a React Native/Expo life logging app that helps users track their remaining time based on target lifespan and maintain daily reflection diaries. The app calculates time remaining until a user-defined target age and provides a diary interface with three core reflection questions.

## Tech Stack

- **Framework**: React Native 0.81.5 with Expo ~54.0
- **Language**: TypeScript (strict mode enabled)
- **Navigation**: React Navigation v7 (Native Stack)
- **Storage**: AsyncStorage for all persistent data
- **Styling**: StyleSheet API (no styled-components or CSS-in-JS libraries)
- **Fonts**: Noto Sans JP (Japanese typography)

## Architecture & Data Flow

### Storage Layer (`src/utils/storage.ts`)

All data persistence uses AsyncStorage with two primary keys:

- `@pivot_log_settings`: User settings (birthday, targetLifespan)
- `@pivot_log_diaries`: Array of diary entries, sorted by date descending

**Critical Pattern**: Diary entries use date as ID (`YYYY-MM-DD` format). When saving, the entire array is read, modified, re-sorted, and written back atomically. No incremental updates.

### Navigation Flow

1. **Splash** → checks settings → **InitialSetup** (if first run) OR **Home**
2. **Home** contains TabBar switching between home view and diary list (client-side routing, not stack navigation)
3. All edit screens (EditBirthday, EditLifespan, DiaryEntry) are separate stack screens with their own navigation

### Theme System (`src/theme/`)

Centralized theming with named exports:

```typescript
import { colors, fonts, spacing } from "../theme";
// Use: colors.primary, fonts.regular, spacing.md
```

**Primary color**: `#8B9D83` (sage green) - used for all CTAs, active states, progress bars

### Type Safety

- Navigation types in `src/types/navigation.ts` define all screen params
- Use typed navigation hooks: `useNavigation<HomeScreenNavigationProp>()`
- Storage types (`UserSettings`, `DiaryEntry`) defined in `src/utils/storage.ts`

## Development Workflow

### Running the App

```bash
# Start Expo dev server (recommended)
npx expo start

# Platform-specific
npm run ios
npm run android

# Cache issues (common with native dependencies)
rm -rf node_modules/.cache && npx expo start --clear
```

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix where possible
```

ESLint config uses flat config format with TypeScript, React, React Hooks, and React Native plugins.

## Code Conventions

### Component Structure

1. Imports: React, React Native, third-party, local components, utils, types, theme (in that order)
2. Type definitions before component
3. Component implementation
4. StyleSheet at bottom
5. Export at end

Example from `HomeScreen.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { HomeScreenNavigationProp } from "../types/navigation";
import { loadUserSettings } from "../utils/storage";
import { colors, fonts, spacing } from "../theme";

const HomeScreen: React.FC = () => {
  /* ... */
};

const styles = StyleSheet.create({
  /* ... */
});
```

### Date Handling

**Always use ISO 8601 format (`YYYY-MM-DD`)** for dates. To avoid timezone issues:

```typescript
// ✅ Correct: Parse date components individually
const [year, month, day] = settings.birthday.split("-").map(Number);
const birthday = new Date(year, month - 1, day, 0, 0, 0, 0);

// ❌ Avoid: Direct parsing can cause timezone shifts
const birthday = new Date(settings.birthday);
```

### Constants

Shared constants (like diary questions) live in `src/constants/`. Reference them directly:

```typescript
import { DIARY_QUESTIONS } from "../constants/diary";
// Use: DIARY_QUESTIONS.goodTime.label
```

### Common Components

- `Button.tsx`: Standard CTA with primary/secondary variants
- `TabBar.tsx`: Bottom navigation for Home/DiaryList (not react-navigation tabs)

## Critical Patterns

### Initial Setup Check

`App.tsx` checks for existing settings on mount to route between `InitialSetup` and `Home`:

```typescript
const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
useEffect(() => {
  const settings = await loadUserSettings();
  setIsSetupComplete(settings !== null);
}, []);
```

### Diary Entry Uniqueness

Diary IDs are the date string (`YYYY-MM-DD`). When saving:

1. Load all entries
2. Find by ID (date)
3. Update existing OR push new
4. Sort by date descending
5. Save entire array

### Time Calculation (HomeScreen)

Real-time countdown using `setInterval` that recalculates years/months/days/hours/minutes/seconds from target date. Uses accurate calendar math accounting for varying month lengths.

## Common Gotchas

1. **Expo SDK version pinning**: Dependencies use `~` versioning to match Expo SDK 54. Don't upgrade individually without checking compatibility.
2. **Font loading**: App shows `ActivityIndicator` until `useFonts()` returns loaded. Never render text before fonts load.
3. **Safe Area**: All screens wrapped in `SafeAreaProvider` at root, use `SafeAreaView` in individual screens.
4. **Navigation params**: TypeScript requires all params defined in `RootStackParamList`, even if `undefined`.

## When Adding Features

- **New screen**: Add to `RootStackParamList`, create typed navigation prop, register in `App.tsx` Stack.Navigator
- **New storage field**: Update interface in `storage.ts`, add migration logic if needed (current version has no migrations)
- **New theme value**: Add to appropriate file in `src/theme/`, ensure it's exported through `index.ts`
- **Shared UI**: Create in `src/components/common/`, follow existing Button/TabBar patterns

## Japanese Language

UI is fully Japanese. All user-facing strings should be in Japanese. Comments can be in Japanese or English (currently mixed).
