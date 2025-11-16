# Project Structure Guide
## FanBattle - NPL Fantasy Predictor Application

This document outlines the recommended directory structure and file organization for the FanBattle project.

---

## Overview

FanBattle is organized as a **monorepo** with three main applications:
1. **Mobile App** (React Native)
2. **Backend API** (Node.js + NestJS)
3. **Admin Panel** (React)

---

## Root Directory Structure

```
FanBattle/
├── .github/                      # GitHub Actions CI/CD workflows
│   └── workflows/
│       ├── backend-ci.yml        # Backend testing and deployment
│       ├── mobile-ci.yml         # Mobile app testing and builds
│       └── admin-ci.yml          # Admin panel deployment
│
├── mobile/                       # React Native mobile application
├── backend/                      # Node.js API server
├── admin/                        # React admin panel
├── shared/                       # Shared utilities and types (optional)
│   ├── types/                    # TypeScript type definitions
│   └── constants/                # Shared constants
│
├── docs/                         # Additional documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture diagrams
│   └── user-guides/              # User documentation
│
├── scripts/                      # Utility scripts
│   ├── seed-database.js          # Database seeding
│   ├── backup-database.sh        # Backup scripts
│   └── deploy.sh                 # Deployment automation
│
├── docker-compose.yml            # Local development environment
├── .gitignore                    # Git ignore rules
├── README.md                     # Project overview
├── PRD.md                        # Product Requirements Document
├── DEVELOPMENT_PLAN.md           # Development roadmap
├── PROJECT_STRUCTURE.md          # This file
└── schema.sql                    # Database schema
```

---

## Mobile App Structure (`/mobile`)

```
mobile/
├── src/
│   ├── screens/                  # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── TournamentListScreen.tsx
│   │   │   └── TournamentDetailScreen.tsx
│   │   ├── fixtures/
│   │   │   ├── FixturesScreen.tsx
│   │   │   └── MatchDetailScreen.tsx
│   │   ├── teams/
│   │   │   ├── TeamsListScreen.tsx
│   │   │   ├── TeamDetailScreen.tsx
│   │   │   └── PlayerDetailScreen.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── BattleStatsScreen.tsx
│   │   │   ├── LeaderboardScreen.tsx
│   │   │   └── FinancialSummaryScreen.tsx
│   │   ├── predictions/
│   │   │   ├── PredictionFormScreen.tsx
│   │   │   ├── PredictionHistoryScreen.tsx
│   │   │   └── PredictionDetailScreen.tsx
│   │   └── registration/
│   │       ├── TournamentRegistrationScreen.tsx
│   │       ├── SeasonTeamSelectionScreen.tsx
│   │       ├── TournamentEndPredictionsScreen.tsx
│   │       └── PaymentScreen.tsx
│   │
│   ├── components/               # Reusable UI components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── tournament/
│   │   │   ├── TournamentCard.tsx
│   │   │   ├── FixtureCard.tsx
│   │   │   └── MatchStatusBadge.tsx
│   │   ├── prediction/
│   │   │   ├── TeamSelector.tsx
│   │   │   ├── PlayerSelector.tsx
│   │   │   ├── ScoreCategorySelector.tsx
│   │   │   ├── WicketsSelector.tsx
│   │   │   └── PredictionSummaryCard.tsx
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardRow.tsx
│   │   │   └── RankBadge.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── TabBar.tsx
│   │       └── DrawerContent.tsx
│   │
│   ├── navigation/               # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── types.ts
│   │
│   ├── store/                    # Redux store
│   │   ├── index.ts              # Store configuration
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── tournamentSlice.ts
│   │   │   ├── predictionSlice.ts
│   │   │   ├── leaderboardSlice.ts
│   │   │   └── notificationSlice.ts
│   │   └── api/                  # RTK Query API slices
│   │       ├── authApi.ts
│   │       ├── tournamentApi.ts
│   │       ├── predictionApi.ts
│   │       └── paymentApi.ts
│   │
│   ├── services/                 # Business logic and API calls
│   │   ├── api/
│   │   │   ├── client.ts         # Axios configuration
│   │   │   ├── auth.ts
│   │   │   ├── tournaments.ts
│   │   │   ├── predictions.ts
│   │   │   └── payments.ts
│   │   ├── auth/
│   │   │   ├── facebookAuth.ts
│   │   │   └── googleAuth.ts
│   │   ├── storage/
│   │   │   ├── tokenStorage.ts
│   │   │   └── cacheStorage.ts
│   │   ├── notifications/
│   │   │   ├── fcmService.ts
│   │   │   └── notificationHandler.ts
│   │   └── payments/
│   │       └── stripeService.ts
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePrediction.ts
│   │   ├── useLeaderboard.ts
│   │   ├── useCountdown.ts
│   │   └── useNotifications.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts         # Form validation
│   │   ├── formatting.ts         # Date/number formatting
│   │   ├── scoring.ts            # Client-side scoring calculations
│   │   └── helpers.ts            # General helpers
│   │
│   ├── constants/                # App constants
│   │   ├── api.ts                # API endpoints
│   │   ├── colors.ts             # Color palette
│   │   ├── config.ts             # App configuration
│   │   └── scoring.ts            # Scoring rules constants
│   │
│   ├── types/                    # TypeScript types
│   │   ├── models.ts             # Data models
│   │   ├── api.ts                # API types
│   │   └── navigation.ts         # Navigation types
│   │
│   ├── theme/                    # Theme configuration
│   │   ├── index.ts
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── shadows.ts
│   │
│   └── assets/                   # Static assets
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── ios/                          # iOS-specific files
│   ├── FanBattle/
│   ├── Podfile
│   └── Podfile.lock
│
├── android/                      # Android-specific files
│   ├── app/
│   └── build.gradle
│
├── __tests__/                    # Test files
│   ├── screens/
│   ├── components/
│   ├── utils/
│   └── services/
│
├── e2e/                          # End-to-end tests (Detox)
│   ├── config.js
│   └── tests/
│       ├── auth.e2e.ts
│       ├── prediction.e2e.ts
│       └── payment.e2e.ts
│
├── fastlane/                     # Fastlane configuration
│   ├── Fastfile
│   └── Appfile
│
├── .env.example                  # Environment variables template
├── .env.development              # Development environment
├── .env.production               # Production environment
├── app.json                      # React Native configuration
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── README.md                     # Mobile app documentation
```

---

## Backend API Structure (`/backend`)

```
backend/
├── src/
│   ├── main.ts                   # Application entry point
│   ├── app.module.ts             # Root module
│   │
│   ├── config/                   # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── stripe.config.ts
│   │   └── firebase.config.ts
│   │
│   ├── common/                   # Shared utilities
│   │   ├── decorators/           # Custom decorators
│   │   │   ├── auth.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/              # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/               # Guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/         # Interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/                # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   ├── middleware/           # Middleware
│   │   │   ├── logger.middleware.ts
│   │   │   └── rate-limit.middleware.ts
│   │   └── utils/                # Helper functions
│   │       ├── pagination.util.ts
│   │       └── date.util.ts
│   │
│   ├── modules/                  # Feature modules
│   │   │
│   │   ├── auth/                 # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── facebook.strategy.ts
│   │   │   │   └── google.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   │
│   │   ├── users/                # Users module
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── tournaments/          # Tournaments module
│   │   │   ├── tournaments.module.ts
│   │   │   ├── tournaments.controller.ts
│   │   │   ├── tournaments.service.ts
│   │   │   ├── entities/
│   │   │   │   └── tournament.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-tournament.dto.ts
│   │   │       └── update-tournament.dto.ts
│   │   │
│   │   ├── teams/                # Teams module
│   │   │   ├── teams.module.ts
│   │   │   ├── teams.controller.ts
│   │   │   ├── teams.service.ts
│   │   │   ├── entities/
│   │   │   │   └── team.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-team.dto.ts
│   │   │       └── update-team.dto.ts
│   │   │
│   │   ├── players/              # Players module
│   │   │   ├── players.module.ts
│   │   │   ├── players.controller.ts
│   │   │   ├── players.service.ts
│   │   │   ├── entities/
│   │   │   │   └── player.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-player.dto.ts
│   │   │       └── update-player.dto.ts
│   │   │
│   │   ├── matches/              # Matches module
│   │   │   ├── matches.module.ts
│   │   │   ├── matches.controller.ts
│   │   │   ├── matches.service.ts
│   │   │   ├── entities/
│   │   │   │   └── match.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-match.dto.ts
│   │   │       ├── update-match.dto.ts
│   │   │       └── match-result.dto.ts
│   │   │
│   │   ├── entries/              # User entries module
│   │   │   ├── entries.module.ts
│   │   │   ├── entries.controller.ts
│   │   │   ├── entries.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user-entry.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-entry.dto.ts
│   │   │       └── update-entry.dto.ts
│   │   │
│   │   ├── predictions/          # Predictions module
│   │   │   ├── predictions.module.ts
│   │   │   ├── predictions.controller.ts
│   │   │   ├── predictions.service.ts
│   │   │   ├── entities/
│   │   │   │   └── prediction.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-prediction.dto.ts
│   │   │       └── update-prediction.dto.ts
│   │   │
│   │   ├── scoring/              # Scoring engine module (CRITICAL)
│   │   │   ├── scoring.module.ts
│   │   │   ├── scoring.service.ts
│   │   │   ├── scoring.constants.ts
│   │   │   ├── scoring.types.ts
│   │   │   └── scoring.spec.ts   # Extensive unit tests
│   │   │
│   │   ├── leaderboard/          # Leaderboard module
│   │   │   ├── leaderboard.module.ts
│   │   │   ├── leaderboard.controller.ts
│   │   │   ├── leaderboard.service.ts
│   │   │   └── dto/
│   │   │       └── leaderboard.dto.ts
│   │   │
│   │   ├── payments/             # Payments module
│   │   │   ├── payments.module.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── stripe.service.ts
│   │   │   ├── entities/
│   │   │   │   └── transaction.entity.ts
│   │   │   └── dto/
│   │   │       ├── payment-intent.dto.ts
│   │   │       └── webhook.dto.ts
│   │   │
│   │   ├── notifications/        # Notifications module
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── fcm.service.ts
│   │   │   ├── entities/
│   │   │   │   └── notification.entity.ts
│   │   │   └── dto/
│   │   │       └── send-notification.dto.ts
│   │   │
│   │   ├── admin/                # Admin module
│   │   │   ├── admin.module.ts
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   └── dto/
│   │   │       └── create-admin.dto.ts
│   │   │
│   │   └── uploads/              # File upload module
│   │       ├── uploads.module.ts
│   │       ├── uploads.controller.ts
│   │       ├── uploads.service.ts
│   │       └── s3.service.ts
│   │
│   └── database/                 # Database related
│       ├── migrations/           # Database migrations
│       └── seeders/              # Database seeders
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Prisma migrations
│   └── seed.ts                   # Database seeding script
│
├── test/                         # Test files
│   ├── unit/                     # Unit tests
│   │   ├── scoring.spec.ts       # Critical: Scoring engine tests
│   │   ├── predictions.spec.ts
│   │   └── leaderboard.spec.ts
│   ├── integration/              # Integration tests
│   │   ├── auth.e2e.spec.ts
│   │   ├── predictions.e2e.spec.ts
│   │   └── payments.e2e.spec.ts
│   └── fixtures/                 # Test data fixtures
│       └── test-data.ts
│
├── scripts/                      # Utility scripts
│   ├── seed-database.ts          # Database seeding
│   └── generate-docs.ts          # API docs generation
│
├── .env.example                  # Environment variables template
├── .env.development              # Development environment
├── .env.test                     # Test environment
├── .env.production               # Production environment
├── Dockerfile                    # Docker configuration
├── docker-compose.yml            # Docker Compose for local dev
├── nest-cli.json                 # NestJS CLI configuration
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.build.json           # Build configuration
├── package.json                  # Dependencies
└── README.md                     # Backend documentation
```

---

## Admin Panel Structure (`/admin`)

```
admin/
├── src/
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Root component
│   ├── index.css                 # Global styles
│   │
│   ├── pages/                    # Page components
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── tournaments/
│   │   │   ├── TournamentsListPage.tsx
│   │   │   ├── TournamentCreatePage.tsx
│   │   │   └── TournamentEditPage.tsx
│   │   ├── teams/
│   │   │   ├── TeamsListPage.tsx
│   │   │   ├── TeamCreatePage.tsx
│   │   │   └── TeamEditPage.tsx
│   │   ├── players/
│   │   │   ├── PlayersListPage.tsx
│   │   │   ├── PlayerCreatePage.tsx
│   │   │   └── PlayerEditPage.tsx
│   │   ├── matches/
│   │   │   ├── MatchesListPage.tsx
│   │   │   ├── MatchCreatePage.tsx
│   │   │   ├── MatchEditPage.tsx
│   │   │   └── MatchResultPage.tsx
│   │   ├── entries/
│   │   │   ├── EntriesListPage.tsx
│   │   │   └── EntryDetailPage.tsx
│   │   ├── predictions/
│   │   │   └── PredictionsListPage.tsx
│   │   ├── leaderboard/
│   │   │   └── LeaderboardPage.tsx
│   │   ├── transactions/
│   │   │   └── TransactionsListPage.tsx
│   │   ├── users/
│   │   │   ├── UsersListPage.tsx
│   │   │   └── UserDetailPage.tsx
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   │
│   ├── components/               # Reusable components
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── forms/
│   │   │   ├── TournamentForm.tsx
│   │   │   ├── TeamForm.tsx
│   │   │   ├── PlayerForm.tsx
│   │   │   ├── MatchForm.tsx
│   │   │   └── ResultForm.tsx
│   │   └── charts/
│   │       ├── UserGrowthChart.tsx
│   │       ├── RevenueChart.tsx
│   │       └── PredictionAccuracyChart.tsx
│   │
│   ├── services/                 # API services
│   │   ├── api/
│   │   │   ├── client.ts         # Axios configuration
│   │   │   ├── auth.ts
│   │   │   ├── tournaments.ts
│   │   │   ├── teams.ts
│   │   │   ├── players.ts
│   │   │   ├── matches.ts
│   │   │   ├── entries.ts
│   │   │   ├── predictions.ts
│   │   │   └── leaderboard.ts
│   │   └── storage/
│   │       └── tokenStorage.ts
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useTournaments.ts
│   │   ├── useMatches.ts
│   │   └── usePagination.ts
│   │
│   ├── store/                    # Redux store
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       └── uiSlice.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── helpers.ts
│   │
│   ├── constants/                # Constants
│   │   ├── api.ts
│   │   ├── routes.ts
│   │   └── config.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── models.ts
│   │   └── api.ts
│   │
│   └── styles/                   # Styles
│       ├── theme.ts              # Material-UI theme
│       └── global.css            # Global CSS
│
├── public/                       # Static files
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│       └── images/
│
├── .env.example                  # Environment variables template
├── .env.development              # Development environment
├── .env.production               # Production environment
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
└── README.md                     # Admin panel documentation
```

---

## Shared Directory Structure (`/shared`) - Optional

```
shared/
├── types/                        # Shared TypeScript types
│   ├── User.ts
│   ├── Tournament.ts
│   ├── Team.ts
│   ├── Player.ts
│   ├── Match.ts
│   ├── Prediction.ts
│   └── index.ts
│
├── constants/                    # Shared constants
│   ├── scoring.ts                # Scoring rules
│   ├── matchTypes.ts
│   └── index.ts
│
├── utils/                        # Shared utility functions
│   ├── validation.ts
│   ├── formatting.ts
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

---

## Documentation Directory (`/docs`)

```
docs/
├── api/                          # API documentation
│   ├── authentication.md
│   ├── tournaments.md
│   ├── predictions.md
│   └── scoring.md
│
├── architecture/                 # Architecture documentation
│   ├── system-overview.md
│   ├── database-design.md
│   ├── api-design.md
│   └── diagrams/
│       ├── architecture.png
│       ├── database-erd.png
│       └── sequence-diagrams.png
│
├── deployment/                   # Deployment guides
│   ├── aws-setup.md
│   ├── ci-cd.md
│   └── monitoring.md
│
├── user-guides/                  # User documentation
│   ├── getting-started.md
│   ├── making-predictions.md
│   └── understanding-scoring.md
│
└── admin-guides/                 # Admin documentation
    ├── tournament-setup.md
    ├── result-entry.md
    └── user-management.md
```

---

## Key File Naming Conventions

### React/React Native Components
- **PascalCase** for component files: `TournamentCard.tsx`, `LoginScreen.tsx`
- **camelCase** for non-component files: `authService.ts`, `helpers.ts`

### Backend Files
- **kebab-case** for modules: `user-entries/`, `match-results/`
- **PascalCase** for classes: `TournamentService`, `ScoringEngine`
- **camelCase** for functions: `calculatePoints()`, `validatePrediction()`

### Database Files
- **snake_case** for tables: `user_entries`, `match_predictions`
- **snake_case** for columns: `first_innings_score`, `man_of_match_id`

### Test Files
- Same name as source file with `.spec.ts` or `.test.ts` suffix
- E2E tests: `.e2e.spec.ts` or `.e2e.test.ts`

---

## Import Path Aliases

Configure path aliases in `tsconfig.json` for cleaner imports:

### Mobile App
```json
{
  "compilerOptions": {
    "paths": {
      "@screens/*": ["src/screens/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@store/*": ["src/store/*"],
      "@utils/*": ["src/utils/*"],
      "@constants/*": ["src/constants/*"],
      "@types/*": ["src/types/*"],
      "@hooks/*": ["src/hooks/*"],
      "@theme/*": ["src/theme/*"],
      "@assets/*": ["src/assets/*"]
    }
  }
}
```

**Usage:**
```typescript
import LoginScreen from '@screens/auth/LoginScreen';
import Button from '@components/common/Button';
import { useAuth } from '@hooks/useAuth';
```

### Backend
```json
{
  "compilerOptions": {
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"]
    }
  }
}
```

**Usage:**
```typescript
import { AuthService } from '@modules/auth/auth.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
```

---

## Environment Variables

### Mobile App (`.env`)
```bash
# API Configuration
API_URL=http://localhost:3000/api/v1
API_TIMEOUT=30000

# Authentication
FACEBOOK_APP_ID=your-facebook-app-id
GOOGLE_CLIENT_ID_IOS=your-ios-client-id
GOOGLE_CLIENT_ID_ANDROID=your-android-client-id

# Payments
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Firebase
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID_IOS=your-ios-app-id
FIREBASE_APP_ID_ANDROID=your-android-app-id

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true
```

### Backend (`.env`)
```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fanbattle
DATABASE_SSL=false

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d

# OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=fanbattle-uploads

# Monitoring
SENTRY_DSN=your-sentry-dsn

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
```

### Admin Panel (`.env`)
```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1

# Feature Flags
VITE_ENABLE_ANALYTICS=true
```

---

## Git Workflow

### Branch Naming
```
feature/user-authentication
feature/scoring-engine
feature/payment-integration

bugfix/login-error
bugfix/scoring-calculation

hotfix/production-crash

release/v1.0.0
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(predictions): add deadline validation

Prevent users from submitting predictions after match start time.
Includes error messaging and UI updates.

Closes #123
```

```
fix(scoring): correct season team penalty calculation

Season team loss penalty was not being applied correctly in playoff matches.

Fixes #456
```

---

## Testing Organization

### Mobile App Tests
```
mobile/__tests__/
├── screens/
│   ├── LoginScreen.test.tsx
│   └── PredictionFormScreen.test.tsx
├── components/
│   ├── TeamSelector.test.tsx
│   └── LeaderboardRow.test.tsx
├── utils/
│   └── validation.test.ts
└── services/
    └── authService.test.ts
```

### Backend Tests
```
backend/test/
├── unit/
│   ├── scoring.service.spec.ts       # CRITICAL: Comprehensive scoring tests
│   ├── predictions.service.spec.ts
│   └── leaderboard.service.spec.ts
├── integration/
│   ├── auth.e2e.spec.ts
│   ├── predictions.e2e.spec.ts
│   └── scoring.e2e.spec.ts
└── fixtures/
    └── test-data.ts
```

---

## Build and Deployment Artifacts

### Mobile App
```
mobile/
├── ios/build/                    # iOS build artifacts (gitignored)
├── android/app/build/            # Android build artifacts (gitignored)
├── ios/FanBattle.ipa             # iOS distributable
└── android/app/release/app-release.aab  # Android App Bundle
```

### Backend
```
backend/
├── dist/                         # Compiled JavaScript (gitignored)
└── Dockerfile                    # Docker image definition
```

### Admin Panel
```
admin/
└── dist/                         # Production build (gitignored)
```

---

## Scripts Directory

```
scripts/
├── seed-database.js              # Seed database with sample data
├── backup-database.sh            # Backup production database
├── restore-database.sh           # Restore database from backup
├── deploy-backend.sh             # Deploy backend to AWS
├── deploy-admin.sh               # Deploy admin panel
├── run-migrations.sh             # Run database migrations
└── generate-test-data.js         # Generate test data for development
```

---

## Docker Configuration

### `docker-compose.yml` (Root)
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: fanbattle
      POSTGRES_PASSWORD: password
      POSTGRES_DB: fanbattle
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://fanbattle:password@postgres:5432/fanbattle
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## CI/CD Workflows

### `.github/workflows/backend-ci.yml`
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run test:e2e

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to AWS
        run: ./scripts/deploy-backend.sh
```

---

## Documentation Standards

### Code Comments
```typescript
/**
 * Calculates points earned for a match prediction based on the scoring rules.
 *
 * @param prediction - The user's prediction for the match
 * @param match - The match result
 * @param seasonTeam - The user's selected season team
 * @returns The calculated points and penalty fee
 *
 * @example
 * const result = calculateMatchPoints(prediction, match, seasonTeam);
 * console.log(result.points); // 4
 * console.log(result.penaltyFee); // 0
 */
export function calculateMatchPoints(
  prediction: Prediction,
  match: Match,
  seasonTeam: Team
): ScoringResult {
  // Implementation...
}
```

### README Files
Each major directory should have a `README.md` explaining:
- Purpose of the directory
- Key files and their roles
- How to run/test
- Dependencies and setup

---

## Summary

This structure provides:
- ✅ Clear separation of concerns
- ✅ Scalability for future features
- ✅ Easy navigation for developers
- ✅ Consistent naming conventions
- ✅ Organized testing
- ✅ Efficient CI/CD integration

**Next Steps:**
1. Set up the repository with this structure
2. Create boilerplate for each app (React Native, NestJS, React)
3. Configure development environment (Docker Compose)
4. Set up CI/CD pipelines
5. Begin Phase 1 development

---

**Last Updated:** November 15, 2025  
**Version:** 1.0

