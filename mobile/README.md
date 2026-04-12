# EchoType Mobile App

React Native mobile application for EchoType - an English learning platform with Listen, Speak, Read, and Write modules.

## Tech Stack

- **Framework**: Expo (SDK 54) + React Native
- **Navigation**: Expo Router (file-based routing)
- **Database**: WatermelonDB (local SQLite)
- **State Management**: Zustand
- **Backend**: Supabase (authentication + cloud sync)
- **UI Library**: React Native Paper (Material Design 3)
- **Code Quality**: Biome (linting + formatting)
- **Language**: TypeScript

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Dashboard
│   │   ├── listen.tsx     # Listen module
│   │   ├── speak.tsx      # Speak module
│   │   ├── library.tsx    # Content library
│   │   └── settings.tsx   # Settings
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # UI components (Button, Card)
│   │   └── layout/       # Layout components (Screen)
│   ├── database/         # WatermelonDB setup
│   │   ├── models/       # Database models
│   │   └── schema/       # Database schema
│   ├── stores/           # Zustand stores
│   ├── services/         # External services (Supabase)
│   ├── sync/             # Cloud sync engine
│   ├── types/            # TypeScript types
│   └── constants/        # Constants (theme, etc.)
└── assets/               # Images, fonts, etc.
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (macOS) or Android Emulator
- Expo CLI

### Installation

```bash
cd mobile
npm install
```

### Environment Setup

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

## Features Implemented (Phase 1)

### ✅ Core Infrastructure
- Expo project setup with TypeScript
- File-based routing with Expo Router
- WatermelonDB local database (8 tables)
- Supabase authentication (email/password + OAuth)
- Cloud sync engine with conflict resolution
- Zustand state management (9 stores)
- Material Design 3 UI system
- Development tools (Biome, TypeScript, EAS)

### ✅ Authentication
- Email/password sign up/sign in
- Google OAuth (configured)
- Apple OAuth (configured)
- Session management
- Secure token storage

### ✅ Navigation
- Tab navigation (Dashboard, Listen, Speak, Library, Settings)
- Authentication flow
- Protected routes

### ✅ Database Schema
- Contents (learning materials)
- Learning Records (progress tracking)
- Typing Sessions (practice sessions)
- Books (content collections)
- Conversations (AI chat history)
- Favorites (bookmarked content)
- Favorite Folders (organization)

### ✅ State Management
- Auth store (user session)
- Content store (learning materials)
- Settings store (user preferences)
- Listen/Speak/Read/Write stores (module states)
- Library store (content organization)
- Review store (spaced repetition)
- Sync store (cloud sync status)

## Next Steps (Phase 2+)

- Implement Listen module UI and audio playback
- Implement Speak module with speech recognition
- Implement Read module with text highlighting
- Implement Write module with typing practice
- Add content management (CRUD operations)
- Implement spaced repetition algorithm (FSRS)
- Add offline support
- Implement push notifications
- Add analytics and error tracking

## Testing

The app has been tested on:
- ✅ iOS Simulator (iPhone 16 Pro)
- ⏳ Android Emulator (pending)
- ⏳ Physical devices (pending)

## Build & Deploy

```bash
# Create development build
npm run prebuild

# Build with EAS
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## License

Proprietary - All rights reserved
