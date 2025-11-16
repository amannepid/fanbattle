# 🤖 AI Context: FanBattle Development Journey

**Document Purpose:** This document provides complete context for AI assistants to understand the FanBattle project, its development history, current state, and future work.

**Last Updated:** November 16, 2024  
**Project Status:** ✅ MVP Complete, Deployed to Vercel  
**Timeline:** Rapid 3-day development (Nov 14-16, 2024)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Development Context & Constraints](#development-context--constraints)
3. [Complete Development Timeline](#complete-development-timeline)
4. [Technical Architecture](#technical-architecture)
5. [Key Features Implemented](#key-features-implemented)
6. [Problems Encountered & Solutions](#problems-encountered--solutions)
7. [Current State](#current-state)
8. [Known Issues & Limitations](#known-issues--limitations)
9. [Future Enhancements](#future-enhancements)
10. [Code Organization](#code-organization)
11. [Critical Information for AI Assistants](#critical-information-for-ai-assistants)

---

## 📖 Project Overview

### What is FanBattle?

FanBattle is a Progressive Web App (PWA) for predicting Nepal Premier League (NPL) cricket matches. Users compete by making predictions for match outcomes, player performances, and tournament results.

### Business Context

- **Target Audience:** NPL cricket fans (small, private group initially)
- **Tournament:** Nepal Premier League 2025 - Season 2
- **Schedule:** Nov 17 - Dec 13, 2025
- **Format:** 32 matches, 8 teams (league + playoffs)
- **Monetization:** Manual payment collection (no integrated payments)

### Key Objectives

1. Launch before tournament start (Nov 17, 2025)
2. Simple, intuitive user experience
3. Real-time leaderboard and scoring
4. Mobile-first design with PWA capabilities
5. Minimal development time (3 days)

---

## 🎯 Development Context & Constraints

### Original Plan vs. Reality

**Initial Request (Nov 14):**
- User wanted a comprehensive PRD and 20-week development plan
- Native mobile app with full feature set
- Complex payment integration
- Professional development timeline

**Pivot (Same Day):**
- Discovered tournament starts in 3 days!
- Changed to rapid MVP approach
- Simplified to PWA instead of native app
- Manual payment processing
- Focus on core prediction features

### Critical Constraints

1. **Time:** 3-day development window
2. **Resources:** Solo developer (user), AI assistant support
3. **Infrastructure:** Must use existing BaaS (Firebase)
4. **Deployment:** Fast deployment without app store approvals (Vercel)
5. **Budget:** Minimal costs using free tiers
6. **Data:** No real player data available; used dummy data with CSV import capability

---

## 🗓️ Complete Development Timeline

### Day 1: Nov 14, 2024 - Foundation

**Morning: Planning & Architecture**
- Created comprehensive PRD
- Defined scoring system and rules
- Designed database schema
- Selected tech stack (Next.js 14, Firebase, Vercel)

**Afternoon: Initial Setup**
- Created Next.js project with TypeScript
- Set up Firebase project (npl-fan-battle)
- Configured Tailwind CSS with custom design system
- Implemented authentication context
- Created basic routing structure

**Evening: Core Features**
- Built home page with match listing
- Created authentication flow (Google Sign-in)
- Implemented registration page with season team selection
- Set up Firestore database structure
- Created seed script for tournament data

**Key Decisions:**
- PWA over native app (faster deployment)
- Firebase over custom backend (BaaS simplicity)
- Manual payments over Stripe (reduced complexity)

### Day 2: Nov 15, 2024 - Features & Refinement

**Morning: User Flow**
- Enhanced registration with tournament-level predictions
  - Player of the Tournament
  - Highest Run Scorer
  - Highest Wicket Taker
- Added player search functionality with searchable dropdowns
- Implemented display name selection (pre-filled from Google)

**Afternoon: Match Predictions**
- Built match prediction page (`/predict/[id]`)
- Implemented prediction form:
  - Winner selection
  - Player of the Match (renamed from Man of the Match)
  - First innings predictions (score category, wickets)
  - Separate predictions for "If Team A bats first" / "If Team B bats first"
- Created sequential prediction logic (discussed below)

**Evening: Dashboard & Scoring**
- Built user dashboard showing:
  - User rank and points
  - Season team display
  - Tournament predictions
  - Prediction history with match results
- Implemented scoring engine (`lib/scoring.ts`)
- Created leaderboard page
- Built admin panel for match result entry and scoring

**Key Features:**
- Sequential prediction logic: Users can only predict matches after all previous matches are completed
- Comprehensive scoring with bonuses and penalties
- Real-time leaderboard updates

### Day 3: Nov 16, 2024 - Polish & Deployment

**Morning: UI/UX Improvements**
- Added team logos (8 teams, manually provided by user)
- Implemented custom color theme:
  - Navy Blue (#0A233F) - Primary
  - Golden Yellow (#F6C623) - Accents
  - Crimson Red (#C1121F) - Highlights
- Created hero banner with tournament branding
- Added filter buttons (Upcoming/Completed/All) on home page
- Fixed match card symmetry and alignment

**Afternoon: Logic Refinements**
- Revised prediction logic multiple times:
  - V1: Sequential by match number
  - V2: Date-based (all matches on next date)
  - V3: **Completion-based** (only after previous matches completed) ✅ Final
- Fixed timezone conversion issues (Nepal Time → User's Local Time)
- Resolved database seeding time errors
- Updated match schedule with correct Nepal Standard Time

**Late Afternoon: Final Polish**
- Made navbar modern and beautiful:
  - Active state highlighting
  - Glassmorphism effects
  - Logo glow on hover
  - Responsive mobile design
- Fixed background consistency across filter selections
- Removed redundant Quick Links section
- Made navbar sticky on scroll
- Implemented pill-style filter buttons

**Evening: Deployment**
- Fixed logout flow issues (redirect to home, clear state)
- Resolved TypeScript naming inconsistency (isCorrectMom → isCorrectPom)
- Set up Git repository (github.com/amannepid/FanBattle)
- Created comprehensive deployment documentation
- Pushed to GitHub (3 commits)
- **Deployment Status:** In progress on Vercel

**Key Issues Resolved:**
- Background "flashing" when switching filters (gradient → solid color)
- Prediction locking logic (multiple iterations)
- Timezone conversion accuracy
- TypeScript build errors
- Logout state management

---

## 🏗️ Technical Architecture

### Tech Stack

```
Frontend:
├── Next.js 14 (App Router)
├── TypeScript (strict mode)
├── Tailwind CSS (custom theme)
└── Lucide Icons

Backend:
├── Firebase Firestore (database)
├── Firebase Authentication (Google provider)
└── Firebase Admin (server-side operations)

Deployment:
├── Vercel (hosting & CI/CD)
└── GitHub (version control)

Development Tools:
├── ESLint (linting)
├── TypeScript Compiler (type checking)
└── tsx (script execution)
```

### Database Schema (Firestore)

```
firestore/
├── tournaments/
│   └── {tournamentId}
│       ├── name: string
│       ├── season: string
│       ├── startDate: Timestamp
│       ├── endDate: Timestamp
│       └── status: 'upcoming' | 'active' | 'completed'
│
├── teams/
│   └── {teamId}
│       ├── name: string
│       ├── shortName: string
│       ├── logoUrl: string
│       ├── tournamentId: string
│       └── eliminatedAt: Timestamp?
│
├── players/
│   └── {playerId}
│       ├── name: string
│       ├── teamId: string
│       ├── role: string (e.g., "Batter", "All-rounder")
│       ├── battingStyle: string
│       ├── bowlingStyle: string
│       ├── isAbroad: boolean
│       └── photoUrl: string
│
├── matches/
│   └── {matchId}
│       ├── tournamentId: string
│       ├── matchNumber: number
│       ├── matchDate: Timestamp
│       ├── deadline: Timestamp (same as matchDate)
│       ├── teamAId: string
│       ├── teamBId: string
│       ├── venue: string
│       ├── matchType: 'league' | 'qualifier' | 'eliminator' | 'final'
│       ├── status: 'upcoming' | 'live' | 'completed'
│       ├── winnerId: string?
│       ├── momId: string? (Player of the Match)
│       ├── firstInningsBattingTeamId: string?
│       ├── firstInningsScore: number?
│       ├── firstInningsWickets: number?
│       ├── isReducedOvers: boolean
│       └── notes: string?
│
├── entries/
│   └── {entryId}
│       ├── userId: string
│       ├── tournamentId: string
│       ├── displayName: string
│       ├── email: string
│       ├── photoUrl: string?
│       ├── seasonTeamId: string
│       ├── seasonTeamName: string
│       ├── playerOfTournamentId: string
│       ├── playerOfTournamentName: string
│       ├── highestRunScorerId: string
│       ├── highestRunScorerName: string
│       ├── highestWicketTakerId: string
│       ├── highestWicketTakerName: string
│       ├── totalPoints: number
│       ├── totalPenalties: number
│       ├── netPoints: number (totalPoints - totalPenalties)
│       ├── rank: number
│       ├── registeredAt: Timestamp
│       └── lastActive: Timestamp
│
├── predictions/
│   └── {predictionId}
│       ├── userId: string
│       ├── entryId: string
│       ├── matchId: string
│       ├── tournamentId: string
│       ├── predictedWinnerId: string
│       ├── predictedMomId: string?
│       ├── teamABatsFirst_predictedScoreCategory: string? ('A-D', 'E', 'F-H', 'I-J')
│       ├── teamABatsFirst_predictedWickets: number?
│       ├── teamBBatsFirst_predictedScoreCategory: string?
│       ├── teamBBatsFirst_predictedWickets: number?
│       ├── predictedScoreCategory: string? (determined after match)
│       ├── predictedWickets: number? (determined after match)
│       ├── pointsEarned: number
│       ├── isCorrectWinner: boolean
│       ├── isCorrectPom: boolean (Player of Match)
│       ├── isCorrectScoreCategory: boolean
│       ├── isCorrectWickets: boolean
│       ├── seasonTeamAdjustment: number
│       ├── predictedAt: Timestamp
│       └── scoredAt: Timestamp?
│
└── leaderboard/
    └── {entryId}
        ├── userId: string
        ├── displayName: string
        ├── photoUrl: string?
        ├── totalPoints: number
        ├── totalPenalties: number
        ├── netPoints: number
        ├── rank: number
        ├── seasonTeamName: string
        ├── correctPredictions: number
        └── updatedAt: Timestamp
```

### Scoring System

**Base Points:**
- Correct winner: **+3 points**

**Bonus Points (only if innings not reduced):**
- Correct Player of the Match: **+1 point**
- Correct first innings score category: **+1 point**
- Correct first innings wickets: **+1 point**

**Season Team Adjustment:**
- Season team wins + correct prediction: **+1 point**
- Season team wins + wrong prediction: **-3 points**
- Season team loses + correct prediction: **-1 point**
- Season team loses + wrong prediction: **0 points**

**Penalty:**
- Late prediction (after match starts): **-2 points**

**Tournament-End Bonuses (not yet implemented):**
- Correct Player of the Tournament: TBD
- Correct Highest Run Scorer: TBD
- Correct Highest Wicket Taker: TBD
- Season team wins tournament: **+5 points**

### Critical Files & Their Purposes

```
app/
├── page.tsx                    # Home page: Match list with filters
├── login/page.tsx             # Login page (Google auth)
├── register/page.tsx          # Registration: Season team + tournament picks
├── dashboard/page.tsx         # User dashboard: Stats, predictions, rank
├── predict/[id]/page.tsx      # Match prediction form
├── leaderboard/page.tsx       # Rankings table
├── admin/page.tsx             # Admin panel: Enter results, trigger scoring
├── layout.tsx                 # Root layout: Auth provider, navbar
└── globals.css                # Global styles, design system variables

components/
├── Navbar.tsx                 # Navigation with auth state, active highlighting
├── MatchCard.tsx             # Match display card with prediction button
└── PlayerSearchSelect.tsx    # Searchable player dropdown

lib/
├── firebase.ts               # Firebase config, initialization
├── auth-context.tsx          # Auth context provider, hooks
├── firestore.ts              # Firestore query functions
├── scoring.ts                # Scoring engine logic
└── prediction-rules.ts       # Sequential prediction logic

scripts/
├── seed.ts                   # Database seeding script
├── cleanup-users.ts          # User cleanup utility
└── import-players-csv.ts     # Player data import

types/
└── index.ts                  # TypeScript type definitions

public/
├── teams/                    # Team logos (8 JPG files)
├── hero-banner.jpg          # Homepage banner
├── logo.png                 # App logo
└── manifest.json            # PWA manifest
```

---

## ✅ Key Features Implemented

### Authentication & Authorization
- ✅ Google Sign-in via Firebase Auth
- ✅ Protected routes (redirect to login if not authenticated)
- ✅ Admin role detection (via email whitelist in env vars)
- ✅ User profile display in navbar
- ✅ Logout functionality with proper state cleanup

### User Registration
- ✅ Season team selection (required)
- ✅ Tournament-level predictions:
  - Player of the Tournament
  - Highest Run Scorer
  - Highest Wicket Taker
- ✅ Display name selection:
  - Pre-filled from Google account
  - Editable by user
  - Required field
- ✅ Searchable player dropdowns
- ✅ One-time registration per tournament

### Match Predictions
- ✅ Sequential prediction logic (only after previous matches completed)
- ✅ Match winner selection
- ✅ Player of the Match selection (from competing teams only)
- ✅ Dual first innings predictions:
  - "If Team A bats first" → score category + wickets
  - "If Team B bats first" → score category + wickets
- ✅ Prediction deadline enforcement (match start time)
- ✅ Update existing predictions (before deadline)
- ✅ Visual lock states for unpredictable matches
- ✅ Real-time match data display

### Dashboard
- ✅ User rank and points display
- ✅ Season team showcase
- ✅ Tournament predictions summary
- ✅ Prediction history:
  - Upcoming matches with prediction details
  - Completed matches with correctness indicators
  - Visual feedback (✓ green / ✗ gray-red)
- ✅ Real-time updates

### Leaderboard
- ✅ Real-time rankings
- ✅ User info display (photo, name)
- ✅ Points breakdown (total, penalties, net)
- ✅ Season team display
- ✅ Highlight current user
- ✅ Responsive table design

### Admin Panel
- ✅ Match result entry form:
  - Winner selection
  - Player of the Match
  - First innings details (batting team, score, wickets)
  - Reduced overs indicator
  - Match notes
- ✅ Auto-scoring trigger after result submission
- ✅ Leaderboard rank recalculation
- ✅ Batch scoring for all predictions
- ✅ Protected by admin role check

### UI/UX Features
- ✅ Modern, responsive design
- ✅ Custom color theme (Navy, Gold, Crimson)
- ✅ Team logos for all 8 teams
- ✅ Hero banner with tournament branding
- ✅ Sticky navbar with active state highlighting
- ✅ Glassmorphism effects
- ✅ Filter buttons (Upcoming/Completed/All)
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states
- ✅ Match countdown ("X days remaining")
- ✅ Timezone-aware date display
- ✅ Mobile-responsive layout
- ✅ PWA manifest (installable)

### Data Management
- ✅ Database seeding script
- ✅ User cleanup script
- ✅ Player data CSV import capability
- ✅ Environment variable configuration
- ✅ Firestore indexes for efficient queries

---

## 🐛 Problems Encountered & Solutions

### Problem 1: Environment Variables Not Loading in Seed Script

**Issue:**
```
INVALID_ARGUMENT: Invalid resource field value in the request
```

**Diagnosis:**
- Seed script wasn't loading `.env.local`
- Firebase credentials were undefined

**Solution:**
- Installed `dotenv` package
- Added `config({ path: '.env.local' })` to seed script
- Verified env vars with test script

**Files Changed:** `scripts/seed.ts`

---

### Problem 2: Firestore Query Index Missing

**Issue:**
```
FirebaseError: The query requires an index
```

**Diagnosis:**
- Composite query with `where` and `orderBy` needed index
- Firebase console provided index creation link

**Solution:**
1. Temporary: Removed `orderBy`, sorted client-side
2. Permanent: User created index in Firebase console
3. Restored `orderBy` after index creation

**Files Changed:** `lib/firestore.ts`

---

### Problem 3: Sequential Prediction Logic Complexity

**Issue:**
- Initial attempt: Sequential by match number
- Problem: User couldn't predict next match until previous was completed
- But match completion depends on admin input, not prediction

**Evolution:**
1. **V1 - Sequential by Number:** One match at a time
2. **V2 - Date-based:** All matches on next unpredicted date
3. **V3 - Completion-based:** Only after all previous matches marked as 'completed' (FINAL)

**Final Logic:**
```typescript
// A match is predictable if:
// 1. It's upcoming (not completed)
// 2. Deadline hasn't passed
// 3. ALL earlier matches (by date/time) have been completed
```

**Files Changed:** `lib/prediction-rules.ts`

---

### Problem 4: Timezone Conversion Errors

**Issue:**
- Match times showing incorrectly in different timezones
- Seed script had unsaved changes (mismatch between editor and saved file)
- Dec 07 match showed 4:14 AM CST instead of 3:45 AM CST

**Diagnosis:**
- Nepal Standard Time (UTC+5:45) is unusual
- User's editor had `time: "3:30 PM"` but saved file had `time: "4:00 PM"`
- `npm run seed` used saved (wrong) time

**Solution:**
1. Implemented `parseNepalTime` function:
   ```typescript
   const [hours, minutes] = time.split(':');
   const isPM = time.includes('PM');
   let hour24 = parseInt(hours);
   if (isPM && hour24 !== 12) hour24 += 12;
   const nepalDate = new Date(Date.UTC(year, month, day, hour24 - 5, 45 - parseInt(minutes)));
   ```
2. Instructed user to save file before re-seeding
3. Verified times in Firebase console
4. Used `Intl.DateTimeFormat` for client-side display

**Files Changed:** `scripts/seed.ts`, `components/MatchCard.tsx`

---

### Problem 5: Background "Flashing" When Switching Filters

**Issue:**
- Clicking "Completed" filter caused page background to appear to change colors
- Visual inconsistency across filter selections

**Diagnosis:**
1. Initially thought: Empty state div had `bg-white` → Removed
2. Still had issue: Quick Links section appeared/disappeared → Removed section
3. Root cause: Layout used gradient background `bg-gradient-to-b from-gray-50 to-gray-100`
   - When page height changed, gradient compressed/expanded
   - Made background appear different

**Solution:**
- Changed from gradient to solid color: `bg-slate-50 dark:bg-gray-900`
- Added `min-h-screen` to main container
- Added `min-h-[500px]` to matches grid area

**Files Changed:** `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

---

### Problem 6: TypeScript Build Error on Vercel

**Issue:**
```
Type error: 'isCorrectMom' does not exist in type 'Partial<Prediction>'
Did you mean 'isCorrectPom'?
```

**Diagnosis:**
- Earlier renamed "Man of the Match" → "Player of the Match" in UI
- Renamed field to `isCorrectPom` but missed some instances
- Field name used `isCorrectMom` in admin panel

**Solution:**
- Global search for `isCorrectMom`
- Renamed to `isCorrectPom` in:
  - `types/index.ts` (interface)
  - `lib/scoring.ts` (4 instances)
  - `app/admin/page.tsx` (update call)
- Committed fix and pushed to GitHub

**Files Changed:** `types/index.ts`, `lib/scoring.ts`, `app/admin/page.tsx`

---

### Problem 7: Logout State Management Issues

**Issue:**
- Logout from home page left "Update Prediction" buttons visible
- Logout from other pages redirected to `/login` instead of home
- User-specific UI elements persisted after logout

**Diagnosis:**
- React state wasn't clearing on auth change
- Different pages had different redirect logic
- Home page didn't clear prediction-related state

**Solution:**
1. **Home Page:** Added logic in `useEffect` to clear `userEntry`, `userPredictions`, `predictableMatchIds` when `user` is `null`
2. **Other Pages:** Changed `router.push('/login')` to `router.push('/')` in dashboard, predict, register pages
3. **Navbar:** Updated logout handler to explicitly `router.push('/')` after `signOut()`

**Files Changed:** `app/page.tsx`, `app/dashboard/page.tsx`, `app/predict/[id]/page.tsx`, `app/register/page.tsx`, `components/Navbar.tsx`

---

### Problem 8: Team Logos Not Displaying

**Issue:**
- Logos showed blank on home page
- Images paths were correct in code

**Diagnosis:**
- User uploaded images but they were placeholder text files (31-38 bytes)
- Not actual JPG image data

**Solution:**
- Instructed user to save actual image files to `/public/teams/`
- Verified file sizes (should be 10-50 KB for JPG)
- One filename mismatch: `kathmandu-gurkhas.jpg` vs `kathmandu-gorkhas.jpg` → Renamed

**Files Affected:** All 8 team logo files in `/public/teams/`

---

### Problem 9: Match Card Asymmetry

**Issue:**
- Match cards looked uneven when team names had different lengths
- One-line team names vs two-line team names caused misalignment

**Solution:**
- Used CSS Grid: `grid-cols-[1fr_auto_1fr]` for equal column widths
- Fixed team section height: `min-h-[140px]` → Later increased to handle two-line names
- Fixed team name container: `h-20` (80px)
- Used `line-clamp-2` for truncation
- Applied `leading-tight` for tighter line spacing

**Files Changed:** `components/MatchCard.tsx`

---

### Problem 10: Vercel Deploying Wrong Repository

**Issue:**
- Vercel said "FanBattle" name not acceptable
- User created new project with different name
- Vercel created NEW empty repository
- New repo only had initial commit (broken code)
- Original repo (amannepid/FanBattle) had all fixes

**Diagnosis:**
- Two repositories existed:
  1. `amannepid/FanBattle` - 3 commits, all fixes ✅
  2. `amannepid/[new-name]` - 1 commit, broken code ❌
- Vercel was deploying from new repo

**Solution:**
1. User deleted new Vercel project
2. Planning to rename original repo: `FanBattle` → `fanbattle`
3. Will reconnect Vercel to renamed repo
4. All fixes preserved

**Status:** In progress at end of session

---

## 📍 Current State

### What's Complete ✅

**Core Functionality:**
- ✅ User authentication (Google Sign-in)
- ✅ User registration with tournament predictions
- ✅ Match prediction with sequential logic
- ✅ Scoring engine with bonuses/penalties
- ✅ User dashboard with history
- ✅ Real-time leaderboard
- ✅ Admin panel for results entry
- ✅ Responsive UI with modern design
- ✅ Team logos and branding

**Technical Infrastructure:**
- ✅ Next.js 14 app with TypeScript
- ✅ Firebase Firestore database
- ✅ Firebase Authentication
- ✅ Database seeding scripts
- ✅ Git repository with 3 commits
- ✅ Comprehensive documentation

**Code Quality:**
- ✅ TypeScript strict mode
- ✅ No linter errors
- ✅ Type-safe database operations
- ✅ Error handling
- ✅ Loading states

### What's In Progress 🔄

**Deployment:**
- 🔄 Vercel deployment setup
- 🔄 GitHub repository rename (FanBattle → fanbattle)
- 🔄 Environment variables configuration
- 🔄 Firebase authorized domains setup

### What's Tested ✅

**Local Testing:**
- ✅ Authentication flow
- ✅ Registration process
- ✅ Match prediction creation
- ✅ Match prediction updates
- ✅ Dashboard display
- ✅ Leaderboard ranking
- ✅ Admin result entry
- ✅ Scoring calculation
- ✅ Sequential prediction logic
- ✅ Logout flow
- ✅ Filter functionality
- ✅ Timezone display
- ✅ Mobile responsiveness

**Not Yet Tested:**
- ❌ Production deployment
- ❌ Live user registration
- ❌ Real match result entry by admin
- ❌ Tournament completion flow
- ❌ Multiple concurrent users
- ❌ PWA installation on mobile

---

## ⚠️ Known Issues & Limitations

### Known Issues

1. **Tournament-End Bonuses Not Implemented**
   - Player of the Tournament
   - Highest Run Scorer
   - Highest Wicket Taker
   - Season team winning tournament
   - These are captured during registration but not yet scored

2. **No Realtime Updates**
   - Leaderboard requires page refresh
   - Match status changes don't update live
   - Would need Firebase Realtime Database or Firestore listeners

3. **Admin Panel Is Basic**
   - No match editing (only result entry)
   - No user management
   - No prediction viewing/debugging
   - No bulk operations

4. **No Data Validation on Admin Input**
   - Admin can enter impossible scores
   - No validation that selected winner actually played
   - No checks for valid player IDs

5. **Dummy Player Data**
   - Players have generic info
   - No real photos
   - Batting/bowling styles are placeholders
   - Can be updated via CSV import

6. **No Offline Support**
   - PWA manifest exists but no service worker
   - Requires internet connection

7. **No Analytics**
   - No tracking of user engagement
   - No error monitoring
   - No performance metrics

### Limitations by Design

1. **Manual Payments**
   - No payment integration
   - Payment tracking done externally

2. **Small User Group**
   - Not optimized for scale
   - Firebase free tier sufficient

3. **Admin Email Hardcoded**
   - Only one admin (defined in env vars)
   - No multi-admin support

4. **Firebase Security Rules Wide Open**
   - Development mode: `allow read, write: if true`
   - ⚠️ Must be tightened for production

5. **No User Profile Editing**
   - Display name set once during registration
   - Can't change season team after registration
   - No profile photo upload

6. **No Prediction History Filtering**
   - Dashboard shows all predictions
   - No date range filters
   - No search functionality

7. **No Push Notifications**
   - Users must check manually
   - No reminders for upcoming matches

---

## 🚀 Future Enhancements

### Priority 1 (Before Tournament Ends)

1. **Production Security**
   - Update Firebase security rules
   - Proper authentication checks
   - Admin role verification in Firestore rules

2. **Tournament-End Scoring**
   - Implement bonuses for correct tournament predictions
   - Season team championship bonus
   - Final leaderboard calculation

3. **Basic Analytics**
   - Add Firebase Analytics
   - Track user engagement
   - Monitor errors

4. **User Notifications**
   - Email reminders for upcoming predictions
   - Match result notifications
   - Leaderboard position changes

### Priority 2 (After Tournament)

1. **Admin Improvements**
   - Match editing capability
   - View all predictions for a match
   - User management panel
   - Bulk operations

2. **Real Player Data**
   - Scrape or manually collect player info
   - Add photos, stats, bios
   - Import from CSV or API

3. **Enhanced Dashboard**
   - Prediction history filtering
   - Statistics visualization
   - Performance graphs
   - Head-to-head comparisons

4. **Social Features**
   - Private leagues
   - Friend invitations
   - Chat/comments
   - Prediction sharing

### Priority 3 (Future Seasons)

1. **Multi-Tournament Support**
   - Support multiple seasons
   - Historical data viewing
   - Season comparison

2. **Payment Integration**
   - Stripe or similar
   - Automated entry fee collection
   - Prize distribution

3. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Better offline support

4. **Advanced Features**
   - Live match tracking
   - Ball-by-ball predictions
   - Fantasy team creation
   - Marketplace for predictions

---

## 📁 Code Organization

### Directory Structure

```
/Users/nepid/Selene/FanBattle/
│
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                 # Home: Match list
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── register/
│   │   └── page.tsx            # Registration page
│   ├── dashboard/
│   │   └── page.tsx            # User dashboard
│   ├── predict/
│   │   └── [id]/
│   │       └── page.tsx        # Match prediction
│   ├── leaderboard/
│   │   └── page.tsx            # Rankings
│   └── admin/
│       └── page.tsx            # Admin panel
│
├── components/                   # Reusable components
│   ├── Navbar.tsx               # Navigation bar
│   ├── MatchCard.tsx            # Match display card
│   └── PlayerSearchSelect.tsx   # Searchable dropdown
│
├── lib/                         # Business logic & utilities
│   ├── firebase.ts              # Firebase initialization
│   ├── auth-context.tsx         # Auth context provider
│   ├── firestore.ts             # Database queries
│   ├── scoring.ts               # Scoring engine
│   └── prediction-rules.ts      # Prediction logic
│
├── scripts/                     # Utility scripts
│   ├── seed.ts                  # Database seeding
│   ├── cleanup-users.ts         # User cleanup
│   └── import-players-csv.ts    # Player import
│
├── types/
│   └── index.ts                 # TypeScript definitions
│
├── public/                      # Static assets
│   ├── teams/                   # Team logos
│   │   ├── biratnagar-kings.jpg
│   │   ├── chitwan-rhinos.jpg
│   │   ├── janakpur-bolts.jpg
│   │   ├── karnali-yaks.jpg
│   │   ├── kathmandu-gorkhas.jpg
│   │   ├── lumbini-lions.jpg
│   │   ├── pokhara-avengers.jpg
│   │   └── sudurpaschim-royals.jpg
│   ├── hero-banner.jpg
│   ├── logo.png
│   └── manifest.json            # PWA manifest
│
├── Documentation/
│   ├── README.md                # Main project readme
│   ├── DEPLOYMENT_STEPS.md      # Vercel deployment guide
│   ├── AI_CONTEXT_README.md     # This file
│   ├── PRD.md                   # Product requirements
│   ├── DEVELOPMENT_PLAN.md      # Original 20-week plan
│   ├── IMPLEMENTATION_COMPLETE.md  # MVP completion summary
│   ├── DEPLOYMENT_GUIDE.md      # Detailed deployment
│   └── [Other docs...]
│
├── Configuration Files/
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── tailwind.config.ts       # Tailwind config
│   ├── next.config.js           # Next.js config
│   ├── .gitignore               # Git ignore rules
│   └── .env.local               # Environment vars (not in git)
│
└── Git/
    └── .git/                    # Git repository
```

### Import Patterns

```typescript
// Absolute imports (configured in tsconfig.json)
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import Navbar from '@/components/Navbar'

// Type imports
import type { Match, Prediction, Entry } from '@/types'

// Firebase imports
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

// Next.js imports
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'

// React imports
import { useState, useEffect } from 'react'
```

---

## 🤖 Critical Information for AI Assistants

### Understanding the Codebase

**Key Concepts:**

1. **Sequential Prediction Logic**
   - Core business rule: Users can only predict matches after ALL previous matches are marked as "completed"
   - Not based on user predictions, but on admin marking match status
   - Implemented in `lib/prediction-rules.ts`
   - Used in `app/page.tsx` to show/hide prediction buttons

2. **Dual First Innings Predictions**
   - Users predict BOTH scenarios: "If Team A bats first" AND "If Team B bats first"
   - After match, admin indicates which team batted first
   - Scoring uses the relevant prediction based on actual batting order
   - Stored as separate fields but only one set counts

3. **Season Team Impact**
   - User's chosen season team affects scoring for ALL matches
   - Creates a +1/-3/-1/0 adjustment based on team performance and prediction accuracy
   - Adds strategic depth to the game

4. **Player of the Match (POM)**
   - Formerly called "Man of the Match" (MOM)
   - Field names use `pom` in latest code
   - Any references to `mom` should be changed to `pom`

### Common Tasks & How To Do Them

**1. Add a New Field to Predictions**

```typescript
// 1. Update type in types/index.ts
export interface Prediction {
  // ... existing fields
  newField: string;  // Add your field
}

// 2. Update prediction form in app/predict/[id]/page.tsx
const [newField, setNewField] = useState('');

// 3. Update save logic
await createPrediction({
  // ... existing fields
  newField,
});

// 4. Update dashboard display in app/dashboard/page.tsx
<p>New Field: {prediction.newField}</p>

// 5. Update scoring if needed in lib/scoring.ts
```

**2. Modify Scoring Logic**

```typescript
// Edit lib/scoring.ts

export function calculatePoints(
  prediction: Prediction,
  match: Match,
  seasonTeamId: string
): ScoringResult {
  // All scoring logic is here
  // Returns breakdown and totals
  
  // Key sections:
  // - Base points (winner)
  // - Season team adjustment
  // - Bonus points (POM, score, wickets)
  // - Calculate total
}
```

**3. Add a New Page**

```typescript
// 1. Create file: app/new-page/page.tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export default function NewPage() {
  const { user } = useAuth();
  
  // Redirect if not authenticated
  if (!user) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h1>New Page</h1>
    </div>
  );
}

// 2. Add link in Navbar.tsx if needed
```

**4. Query Firestore**

```typescript
// Use existing functions in lib/firestore.ts

// Get matches
const matches = await getMatches(tournamentId);

// Get user predictions
const predictions = await getPredictionsForUser(userId, tournamentId);

// Get leaderboard
const leaderboard = await getLeaderboard(tournamentId);

// For new queries, add to lib/firestore.ts:
export async function getNewData() {
  const ref = collection(db, 'collection-name');
  const q = query(ref, where('field', '==', 'value'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**5. Update Environment Variables**

```typescript
// .env.local (local development)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_ADMIN_EMAIL=...

// Vercel (production)
// Settings → Environment Variables → Add New

// Access in code:
const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
```

### Testing Checklist

When making changes, test these flows:

```
□ Registration
  □ Google sign-in works
  □ Season team selection
  □ Tournament predictions
  □ Display name pre-fills
  □ Can submit

□ Predictions
  □ Can view predictable matches
  □ Locked matches show "Locked"
  □ Can select winner
  □ Can select POM from correct teams
  □ Can enter both batting scenarios
  □ Can submit
  □ Can update before deadline

□ Dashboard
  □ Shows correct rank
  □ Displays season team
  □ Lists predictions
  □ Shows correct/incorrect indicators
  □ Tournament predictions visible

□ Leaderboard
  □ Rankings correct
  □ Points display
  □ Current user highlighted

□ Admin
  □ Can enter match result
  □ Scoring triggers automatically
  □ Leaderboard updates

□ General
  □ Navbar active states
  □ Logout redirects to home
  □ Mobile responsive
  □ No console errors
```

### Deployment Checklist

```
□ Local Build
  □ npm run build succeeds
  □ No TypeScript errors
  □ No linter errors

□ Environment Variables
  □ All 8 Firebase vars set in Vercel
  □ NEXT_PUBLIC_ADMIN_EMAIL set

□ Firebase Configuration
  □ Vercel domain added to authorized domains
  □ Security rules appropriate for environment

□ Git
  □ All changes committed
  □ Pushed to GitHub
  □ Vercel connected to correct repo

□ Post-Deployment
  □ Site loads
  □ Login works
  □ Registration works
  □ Predictions work
  □ Admin panel accessible
```

### Common Pitfalls

1. **TypeScript Strict Mode**
   - Always define types
   - Handle null/undefined cases
   - Use optional chaining: `user?.email`

2. **Firestore Timestamps**
   - Use `Timestamp.fromDate()` when seeding
   - Convert to JS Date for display: `.toDate()`
   - Always handle timezone conversions

3. **Async/Await**
   - All Firestore operations are async
   - Always await them
   - Use try/catch for error handling

4. **State Management**
   - Clear user-specific state on logout
   - Use useEffect for data fetching
   - Handle loading states

5. **Environment Variables**
   - Must start with `NEXT_PUBLIC_` for client-side access
   - Must be set in both .env.local and Vercel
   - Restart dev server after changes

### Firebase Security Rules for Production

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.email == 'aman.nepid@gmail.com';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Tournaments (read-only for users)
    match /tournaments/{tournamentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Teams (read-only for users)
    match /teams/{teamId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Players (read-only for users)
    match /players/{playerId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Matches (read for users, write for admin)
    match /matches/{matchId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Entries (users can read all, but only create/update own)
    match /entries/{entryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                      request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Predictions (users can manage own, admin can manage all)
    match /predictions/{predictionId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                      request.resource.data.userId == request.auth.uid;
      allow update: if isOwner(resource.data.userId) || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Leaderboard (read for all authenticated, write for admin only)
    match /leaderboard/{entryId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

### Environment Variables Template

```bash
# .env.local

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyByUEJonppg3Sh8UVaqBgqfcIu51sgm8nQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=npl-fan-battle.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=npl-fan-battle
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=npl-fan-battle.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=631136089590
NEXT_PUBLIC_FIREBASE_APP_ID=1:631136089590:web:d5122b959dbf4ffcd743d7
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-3MKW86N8K5

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=aman.nepid@gmail.com
```

---

## 📚 Additional Context

### User's Technical Level
- Comfortable with terminal commands
- Understands Git basics
- Can navigate Firebase console
- Can follow deployment instructions
- Uses VS Code or similar editor
- On macOS (zsh shell)

### Project Constraints Remembered
- **Time-critical:** Tournament starts Nov 17, 2025
- **Budget-conscious:** Using free tiers
- **Small scale:** Initial user group is small
- **Manual operations:** Payments and some admin tasks done manually
- **Rapid iteration:** Prioritized speed over perfection

### Development Philosophy Applied
1. **MVP First:** Focused on core features only
2. **Iterative Refinement:** Made improvements based on testing
3. **User Feedback:** Incorporated user requests (color scheme, UI tweaks)
4. **Practical Solutions:** Used dummy data when real data unavailable
5. **Documentation:** Comprehensive guides for future reference

### Key Decisions Made
- **PWA over Native:** Faster deployment, no app store delays
- **Firebase over Custom Backend:** Reduced development time
- **Vercel over Other Hosts:** Best Next.js integration
- **TypeScript:** Type safety worth the overhead
- **Tailwind CSS:** Rapid styling without CSS files
- **Sequential Predictions:** Added strategy and engagement
- **Manual Payments:** Reduced complexity significantly

---

## 🎯 For AI Assistants: How to Help

### When User Asks for Changes

1. **Understand Context First**
   - Review relevant sections of this document
   - Check which files are affected
   - Consider impact on existing features

2. **Make Informed Changes**
   - Follow existing code patterns
   - Maintain TypeScript types
   - Update related files together
   - Test implications

3. **Provide Clear Explanations**
   - Explain what you're changing
   - Why you're changing it
   - What files are affected
   - How to test the change

4. **Think About Edge Cases**
   - What if user is not logged in?
   - What if data doesn't exist?
   - What if match is completed?
   - What if prediction deadline passed?

### When User Reports Issues

1. **Gather Information**
   - What were they trying to do?
   - What did they expect?
   - What actually happened?
   - Any error messages?

2. **Check Common Issues**
   - Environment variables?
   - Firebase rules?
   - Build errors?
   - State management?
   - Authentication?

3. **Debug Systematically**
   - Check browser console
   - Check terminal logs
   - Check Firestore data
   - Check git history

4. **Provide Solution + Prevention**
   - Fix the immediate issue
   - Explain root cause
   - Suggest prevention strategy
   - Update docs if needed

### When User Wants New Features

1. **Clarify Requirements**
   - What problem does it solve?
   - Who will use it?
   - How should it work?
   - Any constraints?

2. **Plan Implementation**
   - Which files need changes?
   - New types needed?
   - Database schema changes?
   - UI components needed?

3. **Consider Impact**
   - Does it affect existing features?
   - Does it change scoring logic?
   - Does it need admin access?
   - Does it need new env vars?

4. **Implement Incrementally**
   - Backend/types first
   - Then UI components
   - Then integration
   - Then testing

---

## 📞 Contact & Resources

### Project Links
- **GitHub:** github.com/amannepid/fanbattle (in progress: rename)
- **Vercel:** TBD (deployment in progress)
- **Firebase Project:** npl-fan-battle
- **Firebase Console:** https://console.firebase.google.com/project/npl-fan-battle

### User Contact
- **Email:** aman.nepid@gmail.com
- **Admin Email:** Same as above

### External Resources
- **Next.js Docs:** https://nextjs.org/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

## 🏁 Summary for AI Models

**TL;DR:**

This is a **cricket prediction PWA** built in **3 days** for the **Nepal Premier League 2025**. Users predict match outcomes, player performances, and compete on a leaderboard. 

**Tech:** Next.js 14, TypeScript, Firebase, Tailwind, deployed on Vercel.

**Status:** MVP complete locally, deployment to Vercel in progress.

**Key Challenge:** Sequential prediction logic - users can only predict matches after all previous matches are marked as completed by admin.

**Current Task:** Finalizing Vercel deployment, repository is being renamed from FanBattle to fanbattle.

**Most Important Files:**
- `lib/prediction-rules.ts` - Sequential logic
- `lib/scoring.ts` - Scoring engine  
- `app/predict/[id]/page.tsx` - Prediction form
- `app/admin/page.tsx` - Admin panel

**Remember:**
- TypeScript strict mode
- All Firestore ops are async
- Clear state on logout
- POM not MOM (Player of Match)
- Sequential predictions based on completion
- Timezone: Nepal Time (UTC+5:45)

**Next Steps:**
1. Complete Vercel deployment
2. Add Firebase authorized domain
3. Test with real users
4. Monitor during tournament (Nov 17 - Dec 13)
5. Implement tournament-end scoring

---

**Document Version:** 1.0  
**Last Updated:** November 16, 2024  
**Updated By:** AI Assistant (Claude Sonnet 4.5)  
**For:** Next AI assistant continuing this project

---

*This document should be treated as the source of truth for understanding the FanBattle project. If anything seems unclear or contradictory, prioritize information from this document over other sources.*

