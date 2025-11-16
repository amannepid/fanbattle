# Development Plan
## NPL Fantasy Predictor Application

**Version:** 1.0  
**Date:** November 15, 2025  
**Project Duration:** 16-20 weeks (MVP)

---

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Development Phases](#development-phases)
5. [Sprint Breakdown](#sprint-breakdown)
6. [Team Structure](#team-structure)
7. [Risk Management](#risk-management)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Strategy](#deployment-strategy)
10. [Timeline and Milestones](#timeline-and-milestones)

---

## 1. Technology Stack

### 1.1 Mobile Application

**Framework:** React Native (Cross-platform)
- **Rationale**: Single codebase for iOS and Android, faster development, strong community support
- **Alternative**: Flutter (if team has Dart expertise)

**Core Libraries:**
- **Navigation**: React Navigation v6
- **State Management**: Redux Toolkit + RTK Query
- **UI Components**: React Native Paper or NativeBase
- **Forms**: React Hook Form
- **Authentication**: React Native Firebase Auth + Google/Facebook SDKs
- **Push Notifications**: Firebase Cloud Messaging
- **Local Storage**: AsyncStorage + Realm (for offline support)
- **HTTP Client**: Axios
- **Date/Time**: date-fns or Day.js
- **Charts/Graphs**: Victory Native or React Native Chart Kit

**Development Tools:**
- **Package Manager**: Yarn or npm
- **Code Quality**: ESLint, Prettier
- **Type Safety**: TypeScript
- **Testing**: Jest, React Native Testing Library, Detox (E2E)

### 1.2 Backend API

**Runtime:** Node.js (v18 LTS)
- **Framework**: Express.js or NestJS (preferred for structure)
- **Language**: TypeScript

**Core Libraries:**
- **ORM**: Prisma or TypeORM
- **Authentication**: Passport.js (JWT strategy)
- **Validation**: Joi or Zod
- **Security**: Helmet, CORS, bcrypt
- **Logging**: Winston or Pino
- **Cron Jobs**: node-cron (for scheduled tasks)
- **Email**: Nodemailer or SendGrid
- **File Upload**: Multer + AWS S3

**API Documentation:**
- **Swagger/OpenAPI**: Automated API documentation

### 1.3 Admin Panel (Web)

**Framework:** React (v18)
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI (MUI) or Ant Design
- **Forms**: React Hook Form
- **Tables**: TanStack Table (React Table v8)
- **Charts**: Recharts or Chart.js
- **Routing**: React Router v6

### 1.4 Database

**Primary Database:** PostgreSQL 15+
- **Rationale**: Relational data, strong ACID compliance, excellent performance
- **Hosting**: AWS RDS or DigitalOcean Managed Database

**Caching Layer:** Redis
- **Use Cases**: Session management, API response caching, real-time leaderboard

### 1.5 Cloud Infrastructure

**Hosting Provider:** AWS (primary) or DigitalOcean (alternative)

**Services:**
- **Compute**: AWS EC2 or ECS (containerized)
- **Database**: AWS RDS (PostgreSQL)
- **Storage**: AWS S3 (images, assets)
- **CDN**: AWS CloudFront or Cloudflare
- **Cache**: AWS ElastiCache (Redis)
- **Notifications**: Firebase Cloud Messaging
- **Authentication**: Firebase Auth (OAuth providers)
- **Monitoring**: AWS CloudWatch or Datadog
- **Error Tracking**: Sentry

### 1.6 Payment Integration

**Payment Gateway:** Stripe
- **Features**: Card payments, webhooks, refunds, international support
- **Alternative**: PayPal, Razorpay (for specific regions)

### 1.7 Development & DevOps

**Version Control:** Git + GitHub/GitLab
- **Branching Strategy**: Git Flow (main, develop, feature/*, release/*, hotfix/*)

**CI/CD:**
- **GitHub Actions** or **GitLab CI/CD**
- **Mobile**: Fastlane for automated builds
- **Backend**: Docker + automated deployment

**Containerization:**
- **Docker** + **Docker Compose** (local development)
- **Kubernetes** or **ECS** (production - optional for MVP)

**Monitoring & Analytics:**
- **Application Monitoring**: Sentry, Datadog
- **User Analytics**: Firebase Analytics or Mixpanel
- **Logging**: CloudWatch Logs or ELK Stack

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────┬───────────────────┬───────────────────────┤
│   iOS App           │   Android App     │   Admin Web Panel     │
│   (React Native)    │   (React Native)  │   (React)             │
└─────────────────────┴───────────────────┴───────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
│                         (AWS ALB / Nginx)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend API Layer                          │
│                    (Node.js + Express/NestJS)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │ Tournament   │  │ Prediction   │          │
│  │              │  │ Service      │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Scoring      │  │ Payment      │  │ Notification │          │
│  │ Engine       │  │ Service      │  │ Service      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┬────────────────┐
                │             │             │                │
                ▼             ▼             ▼                ▼
┌───────────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────────┐
│   PostgreSQL      │ │   Redis     │ │  AWS S3  │ │   Firebase   │
│   (Primary DB)    │ │   (Cache)   │ │ (Storage)│ │   (Push)     │
└───────────────────┘ └─────────────┘ └──────────┘ └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  External APIs   │
                    ├──────────────────┤
                    │  • Stripe API    │
                    │  • Facebook Auth │
                    │  • Google Auth   │
                    │  • Cricket API   │
                    └──────────────────┘
```

### 2.2 Service Layer Architecture

**Microservices Approach (Modular Monolith for MVP):**

1. **Authentication Service**
   - User registration and login
   - OAuth integration (Facebook, Google)
   - JWT token generation and validation
   - Session management

2. **Tournament Service**
   - Tournament CRUD operations
   - Team and player management
   - Match scheduling
   - Fixture and results display

3. **Prediction Service**
   - Prediction submission
   - Prediction validation
   - Prediction retrieval and editing
   - Deadline enforcement

4. **Scoring Engine**
   - Points calculation (complex business logic)
   - Season team adjustments
   - Bonus calculations
   - Penalty tracking
   - Leaderboard generation

5. **Payment Service**
   - Entry fee processing
   - Penalty fee tracking
   - Refund handling
   - Stripe webhook processing

6. **Notification Service**
   - Push notification dispatch
   - Email notifications
   - SMS (optional)
   - Notification scheduling

### 2.3 Data Flow Examples

#### Example 1: User Submits Prediction

```
1. Mobile App → POST /api/predictions
2. API Gateway → Auth Middleware (validate JWT)
3. Prediction Service → Validate prediction data
4. Prediction Service → Check deadline (match start time)
5. Prediction Service → Save to database
6. Response → Success + prediction ID
7. Mobile App → Update local state
```

#### Example 2: Admin Enters Match Result & Scoring

```
1. Admin Panel → POST /api/matches/{id}/result
2. API Gateway → Admin Auth Middleware
3. Tournament Service → Save match result
4. Tournament Service → Trigger scoring event
5. Scoring Engine → Fetch all predictions for match
6. Scoring Engine → Calculate points for each user:
   - Base points (win/loss)
   - Season team adjustment
   - Bonus points (MoM, score, wickets)
   - Penalty fees
7. Scoring Engine → Update user totals
8. Scoring Engine → Recalculate leaderboard (cache in Redis)
9. Notification Service → Queue push notifications
10. Response → Success + affected users count
```

---

## 3. Database Schema

### 3.1 Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  auth_provider ENUM('facebook', 'google') NOT NULL,
  auth_provider_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(auth_provider, auth_provider_id)
);
```

#### Tournaments Table
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  entry_fee DECIMAL(10, 2) DEFAULT 50.00,
  status ENUM('draft', 'registration_open', 'active', 'completed') DEFAULT 'draft',
  prize_pool DECIMAL(12, 2),
  total_matches INTEGER DEFAULT 32,
  league_matches INTEGER DEFAULT 28,
  playoff_matches INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Teams Table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(10),
  logo_url TEXT,
  home_ground VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, name)
);
```

#### Players Table
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  photo_url TEXT,
  role ENUM('batsman', 'bowler', 'all-rounder', 'wicket-keeper') NOT NULL,
  jersey_number INTEGER,
  batting_stats JSONB, -- {runs, average, strike_rate, centuries, fifties}
  bowling_stats JSONB, -- {wickets, average, economy, best_figures}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Matches Table
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  match_type ENUM('league', 'playoff', 'final') NOT NULL,
  team_a_id UUID REFERENCES teams(id),
  team_b_id UUID REFERENCES teams(id),
  venue VARCHAR(255),
  match_date TIMESTAMP NOT NULL,
  prediction_deadline TIMESTAMP NOT NULL,
  status ENUM('scheduled', 'live', 'completed', 'cancelled') DEFAULT 'scheduled',
  
  -- Results (populated after match)
  winner_team_id UUID REFERENCES teams(id),
  man_of_match_id UUID REFERENCES players(id),
  first_innings_score INTEGER,
  first_innings_wickets INTEGER,
  is_reduced_overs BOOLEAN DEFAULT false,
  is_super_over BOOLEAN DEFAULT false,
  match_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tournament_id, match_number),
  CHECK(team_a_id != team_b_id)
);
```

#### User Entries Table
```sql
CREATE TABLE user_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  season_team_id UUID REFERENCES teams(id),
  
  -- Tournament-end predictions
  highest_run_getter_id UUID REFERENCES players(id),
  highest_wicket_taker_id UUID REFERENCES players(id),
  player_of_tournament_id UUID REFERENCES players(id),
  
  -- Financial
  entry_fee_paid BOOLEAN DEFAULT false,
  entry_fee_amount DECIMAL(10, 2) DEFAULT 50.00,
  payment_transaction_id VARCHAR(255),
  
  -- Scoring
  total_points INTEGER DEFAULT 0,
  total_penalties DECIMAL(10, 2) DEFAULT 0.00,
  current_rank INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, tournament_id)
);
```

#### Predictions Table
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_entry_id UUID REFERENCES user_entries(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Required prediction
  predicted_winner_id UUID REFERENCES teams(id) NOT NULL,
  
  -- Optional predictions
  predicted_mom_id UUID REFERENCES players(id),
  predicted_score_category CHAR(1) CHECK(predicted_score_category IN ('A','B','C','D','E','F')),
  predicted_wickets INTEGER CHECK(predicted_wickets BETWEEN 0 AND 10),
  
  -- Scoring (calculated after match)
  points_earned INTEGER DEFAULT 0,
  penalty_fee DECIMAL(10, 2) DEFAULT 0.00,
  is_correct_winner BOOLEAN,
  is_correct_mom BOOLEAN,
  is_correct_score_category BOOLEAN,
  is_correct_wickets BOOLEAN,
  season_team_adjustment INTEGER DEFAULT 0, -- +1, -1, or 0
  
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scored_at TIMESTAMP,
  
  UNIQUE(user_entry_id, match_id)
);
```

#### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_entry_id UUID REFERENCES user_entries(id),
  transaction_type ENUM('entry_fee', 'penalty', 'refund', 'payout') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_provider VARCHAR(50),
  payment_transaction_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type ENUM('match_result', 'prediction_reminder', 'leaderboard', 'payment', 'announcement') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Admin Users Table
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  role ENUM('super_admin', 'tournament_admin') DEFAULT 'tournament_admin',
  permissions JSONB, -- {tournaments: [id1, id2], features: ['results', 'users']}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Indexes for Performance

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);

-- Tournaments
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);

-- Matches
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_teams ON matches(team_a_id, team_b_id);

-- User Entries
CREATE INDEX idx_user_entries_user ON user_entries(user_id);
CREATE INDEX idx_user_entries_tournament ON user_entries(tournament_id);
CREATE INDEX idx_user_entries_rank ON user_entries(tournament_id, current_rank);

-- Predictions
CREATE INDEX idx_predictions_user_entry ON predictions(user_entry_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_predictions_submitted ON predictions(submitted_at);

-- Transactions
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type, status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

### 3.3 Database Relationships Diagram

```
users ──┬──< user_entries ──< predictions >── matches
        │                    └──< transactions
        └──< admin_users
        └──< notifications

tournaments ──┬──< teams ──< players
              └──< matches
              └──< user_entries

matches ──┬── team_a_id ──> teams
          ├── team_b_id ──> teams
          ├── winner_team_id ──> teams
          └── man_of_match_id ──> players
```

---

## 4. Development Phases

### Phase 1: Foundation & Setup (Weeks 1-2)

**Objective**: Establish project foundation, infrastructure, and development environment

**Deliverables:**
1. Project repository setup (monorepo or separate repos)
2. Development environment configuration
3. CI/CD pipeline setup
4. Database design and initial migration
5. Basic API structure (authentication skeleton)
6. Mobile app boilerplate with navigation
7. Admin panel boilerplate

**Tasks:**
- [ ] Set up Git repository with branching strategy
- [ ] Initialize React Native project with TypeScript
- [ ] Initialize Node.js backend with TypeScript
- [ ] Initialize React admin panel project
- [ ] Set up PostgreSQL database (local + cloud)
- [ ] Set up Redis for caching
- [ ] Create database schema and migrations
- [ ] Set up Docker Compose for local development
- [ ] Configure ESLint, Prettier, and pre-commit hooks
- [ ] Set up GitHub Actions for CI/CD
- [ ] Configure Sentry for error tracking
- [ ] Set up AWS/DigitalOcean infrastructure
- [ ] Set up Firebase project for auth and notifications

**Success Criteria:**
- All developers can run the project locally
- Database schema is finalized and migrated
- CI/CD pipeline runs successfully
- All environments (dev, staging) are operational

---

### Phase 2: Authentication & User Management (Weeks 3-4)

**Objective**: Implement secure authentication and user profile management

**Deliverables:**
1. OAuth integration (Facebook + Google)
2. JWT-based API authentication
3. User registration and login flows
4. Admin authentication
5. User profile management

**Backend Tasks:**
- [ ] Implement JWT authentication middleware
- [ ] Create user registration endpoint
- [ ] Integrate Facebook OAuth
- [ ] Integrate Google OAuth
- [ ] Implement login endpoint (returns JWT)
- [ ] Implement token refresh mechanism
- [ ] Create user profile endpoints (GET, UPDATE)
- [ ] Implement role-based access control (RBAC)
- [ ] Write unit tests for auth service

**Mobile App Tasks:**
- [ ] Create login screen UI
- [ ] Integrate Facebook Login SDK
- [ ] Integrate Google Sign-In SDK
- [ ] Implement secure token storage (Keychain/Keystore)
- [ ] Create profile screen
- [ ] Implement logout functionality
- [ ] Handle authentication errors gracefully

**Admin Panel Tasks:**
- [ ] Create admin login screen
- [ ] Implement session management
- [ ] Create user management dashboard

**Success Criteria:**
- Users can register via Facebook or Google
- Authentication tokens are securely stored
- API endpoints are protected with JWT
- Admin can log in to admin panel

---

### Phase 3: Tournament & Team Management (Weeks 5-6)

**Objective**: Build tournament data structure and admin management tools

**Deliverables:**
1. Tournament CRUD operations (admin)
2. Team and player management (admin)
3. Tournament listing (public and app)
4. Team and player detail pages

**Backend Tasks:**
- [ ] Create tournament CRUD endpoints
- [ ] Create team CRUD endpoints
- [ ] Create player CRUD endpoints
- [ ] Implement file upload for logos/photos (S3)
- [ ] Create public endpoints for tournament listing
- [ ] Create endpoints for team and player details
- [ ] Implement data validation
- [ ] Write unit tests for tournament service

**Admin Panel Tasks:**
- [ ] Create tournament management UI (list, create, edit, delete)
- [ ] Create team management UI (list, create, edit, delete)
- [ ] Create player management UI (list, create, edit, delete)
- [ ] Implement image upload UI
- [ ] Create tournament detail view
- [ ] Implement search and filter functionality

**Mobile App Tasks:**
- [ ] Create home screen with tournament listing
- [ ] Create tournament detail screen
- [ ] Create teams listing screen
- [ ] Create team detail screen
- [ ] Create player listing screen (by team)
- [ ] Create player detail screen
- [ ] Implement pull-to-refresh
- [ ] Cache tournament data locally

**Success Criteria:**
- Admin can create and manage tournaments, teams, players
- Users can view tournament info without login
- All images display correctly
- Data is cached for offline viewing

---

### Phase 4: Match Scheduling & Fixtures (Weeks 7-8)

**Objective**: Implement match scheduling and fixture display

**Deliverables:**
1. Match scheduling (admin)
2. Fixture display with filters
3. Match detail pages
4. Countdown to matches

**Backend Tasks:**
- [ ] Create match CRUD endpoints
- [ ] Implement match validation (teams, dates, etc.)
- [ ] Create fixture endpoints with filtering (upcoming, completed, by team)
- [ ] Create match detail endpoint
- [ ] Implement automatic prediction deadline calculation
- [ ] Write unit tests for match service

**Admin Panel Tasks:**
- [ ] Create match scheduling UI (create, edit, delete)
- [ ] Create fixture management dashboard
- [ ] Implement bulk schedule import (CSV upload)
- [ ] Create match detail view with result entry form

**Mobile App Tasks:**
- [ ] Create fixtures screen (ESPN Cricinfo style)
- [ ] Implement fixture filters (all, upcoming, completed, by team)
- [ ] Create match detail screen
- [ ] Implement countdown timer for upcoming matches
- [ ] Create tie sheet/bracket view (for playoffs)
- [ ] Implement match status indicators (scheduled, live, completed)

**Success Criteria:**
- Admin can schedule all 32 matches
- Users can view fixtures with filters
- Match details display correctly
- Countdown timers work accurately

---

### Phase 5: User Entry & Season Team Selection (Weeks 9-10)

**Objective**: Implement tournament registration and payment

**Deliverables:**
1. Tournament registration flow
2. Season team selection
3. Tournament-end predictions (HRG, HWT, POT)
4. Payment integration (Stripe)
5. Entry confirmation

**Backend Tasks:**
- [ ] Create user entry endpoint (POST /api/entries)
- [ ] Integrate Stripe payment processing
- [ ] Create Stripe webhook handler (payment confirmation)
- [ ] Implement season team validation
- [ ] Create endpoint for tournament-end predictions
- [ ] Implement payment verification before prediction access
- [ ] Send confirmation email/notification
- [ ] Write unit tests for payment service

**Mobile App Tasks:**
- [ ] Create tournament registration screen
- [ ] Create season team selection screen
- [ ] Create tournament-end predictions screen (HRG, HWT, POT)
- [ ] Integrate Stripe payment SDK
- [ ] Create payment confirmation screen
- [ ] Handle payment errors and retries
- [ ] Display entry summary (fee, team, predictions)
- [ ] Lock season team after first match

**Admin Panel Tasks:**
- [ ] Create user entries dashboard
- [ ] Display payment status and transaction history
- [ ] Implement manual entry creation (for testing)
- [ ] Create financial reports (total revenue, pending payments)

**Success Criteria:**
- Users can register and pay $50 entry fee
- Payment is processed securely via Stripe
- Season team is locked after submission
- Admin can view all entries and payments

---

### Phase 6: Prediction Submission System (Weeks 11-12)

**Objective**: Build core prediction submission and validation

**Deliverables:**
1. Prediction submission interface
2. Deadline enforcement
3. Prediction editing (before deadline)
4. Prediction history view
5. Validation and error handling

**Backend Tasks:**
- [ ] Create prediction submission endpoint (POST /api/predictions)
- [ ] Implement deadline validation (reject if past match start)
- [ ] Create prediction update endpoint (PUT /api/predictions/:id)
- [ ] Create endpoint to fetch user's predictions
- [ ] Implement validation (teams, players, categories)
- [ ] Create endpoint for prediction status (submitted/pending by match)
- [ ] Write unit tests for prediction service

**Mobile App Tasks:**
- [ ] Create match prediction screen with form:
  - [ ] Winner selection (required)
  - [ ] Man of the Match dropdown (optional)
  - [ ] Score category buttons (A-F, optional)
  - [ ] Wickets dropdown (0-10, optional)
- [ ] Implement form validation
- [ ] Create prediction confirmation modal
- [ ] Create prediction edit screen (before deadline)
- [ ] Create prediction history screen (list all predictions)
- [ ] Implement deadline indicator (countdown)
- [ ] Lock prediction after deadline
- [ ] Create "My Predictions" tab in dashboard

**Admin Panel Tasks:**
- [ ] Create predictions dashboard (view all user predictions)
- [ ] Filter by match, user, status
- [ ] Export predictions to CSV

**Success Criteria:**
- Users can submit predictions for all matches
- Predictions cannot be submitted after deadline
- Users can edit predictions before deadline
- Prediction history is accessible

---

### Phase 7: Scoring Engine (Weeks 13-14)

**Objective**: Implement complex scoring logic and calculations

**Deliverables:**
1. Scoring engine with all business rules
2. Points calculation per match
3. Penalty tracking
4. Season team adjustments
5. Leaderboard generation

**Backend Tasks:**
- [ ] Create scoring engine service
- [ ] Implement base points calculation:
  - [ ] League match: 3 points (win), 0 (loss), $2 penalty
  - [ ] Playoff: 5 points (win), 0 (loss), $3 penalty
  - [ ] Final: 7 points (win), 0 (loss), $5 penalty
- [ ] Implement season team adjustments:
  - [ ] +1 if season team wins and user predicted correctly
  - [ ] -1 if season team loses (regardless of user prediction)
- [ ] Implement bonus calculations:
  - [ ] +1 for correct MoM
  - [ ] +1 for correct score category (if innings valid)
  - [ ] +1 for correct wickets (if innings valid)
- [ ] Implement match validity rules:
  - [ ] Invalidate score/wickets if reduced overs
  - [ ] Invalidate if draw/cancelled
  - [ ] Award points for super over/DLS wins
- [ ] Create endpoint to trigger scoring (POST /api/matches/:id/score)
- [ ] Implement leaderboard calculation (rank by total points)
- [ ] Cache leaderboard in Redis
- [ ] Write extensive unit tests for scoring logic
- [ ] Create scoring simulation for testing

**Admin Panel Tasks:**
- [ ] Create match result entry form:
  - [ ] Winner selection
  - [ ] First innings score and wickets
  - [ ] Man of the Match selection
  - [ ] Match conditions (normal, reduced overs, cancelled, super over)
  - [ ] Match notes
- [ ] Create "Calculate Scores" button
- [ ] Display scoring results (users affected, points distributed)
- [ ] Create scoring log/audit trail
- [ ] Implement score recalculation (if error detected)

**Mobile App Tasks:**
- [ ] Display points earned per match in prediction history
- [ ] Create detailed points breakdown modal:
  - [ ] Base points
  - [ ] Season team adjustment
  - [ ] Bonus points (MoM, score, wickets)
  - [ ] Penalty fees
- [ ] Update user's total points in real-time
- [ ] Display penalty fees accumulated

**Success Criteria:**
- Scoring engine correctly calculates all scenarios
- Points are accurately distributed after each match
- Penalty fees are tracked correctly
- All edge cases handled (reduced overs, super over, etc.)
- Unit tests cover 95%+ of scoring logic

---

### Phase 8: Leaderboard & User Dashboard (Week 15)

**Objective**: Build comprehensive user dashboard and leaderboard

**Deliverables:**
1. Real-time leaderboard
2. User dashboard with stats
3. Battle stats (prediction history)
4. Financial summary

**Backend Tasks:**
- [ ] Create leaderboard endpoint (GET /api/tournaments/:id/leaderboard)
- [ ] Implement pagination for leaderboard
- [ ] Create user stats endpoint (GET /api/users/me/stats)
- [ ] Create battle stats endpoint (match-by-match breakdown)
- [ ] Implement caching for leaderboard (Redis)
- [ ] Create endpoint for financial summary

**Mobile App Tasks:**
- [ ] Create leaderboard screen:
  - [ ] Display rank, username, total points
  - [ ] Highlight current user
  - [ ] Show top 10 and user's position
  - [ ] Implement pull-to-refresh
- [ ] Create user dashboard with:
  - [ ] Tournament overview (name, dates, status)
  - [ ] User's total points and rank
  - [ ] Season team performance
  - [ ] Upcoming matches requiring predictions
  - [ ] Recent match results
- [ ] Create battle stats screen:
  - [ ] Match-by-match list
  - [ ] Points earned per match
  - [ ] Filter by match type (league, playoffs)
  - [ ] Sort by date or points
- [ ] Create financial summary screen:
  - [ ] Entry fee: $50
  - [ ] Penalties: $X
  - [ ] Net balance: $50 - $X
  - [ ] Transaction history

**Admin Panel Tasks:**
- [ ] Create tournament leaderboard view
- [ ] Export leaderboard to CSV
- [ ] Create user performance analytics

**Success Criteria:**
- Leaderboard updates in real-time after scoring
- User dashboard displays accurate stats
- Battle stats show complete prediction history
- Financial summary is accurate

---

### Phase 9: Notifications & Tournament-End Features (Week 16)

**Objective**: Implement push notifications and tournament completion features

**Deliverables:**
1. Push notification system
2. Tournament-end bonus calculations
3. Final standings and prizes
4. User notifications for key events

**Backend Tasks:**
- [ ] Implement Firebase Cloud Messaging integration
- [ ] Create notification service
- [ ] Implement notification types:
  - [ ] Prediction deadline reminders (30 min before)
  - [ ] Match result available
  - [ ] Leaderboard position changes
  - [ ] Tournament start/end
  - [ ] Payment confirmations
- [ ] Create notification scheduling (cron jobs)
- [ ] Implement tournament-end bonus calculations:
  - [ ] +5 if season team wins title
  - [ ] +5 for correct HRG prediction
  - [ ] +5 for correct HWT prediction
  - [ ] +5 for correct POT prediction
- [ ] Create endpoint for tournament completion
- [ ] Calculate final standings and prize distribution
- [ ] Send tournament completion notifications

**Mobile App Tasks:**
- [ ] Integrate Firebase Cloud Messaging
- [ ] Request notification permissions
- [ ] Handle notification tap events (deep linking)
- [ ] Display in-app notifications
- [ ] Create notifications history screen
- [ ] Implement notification preferences (settings)

**Admin Panel Tasks:**
- [ ] Create notification management UI (send custom notifications)
- [ ] Create tournament completion workflow
- [ ] Enter tournament-end results (HRG, HWT, POT)
- [ ] Trigger final bonus calculations
- [ ] Display final standings and prize winners

**Success Criteria:**
- Users receive push notifications for key events
- Tournament-end bonuses are calculated correctly
- Final standings are accurate
- Users are notified of tournament completion

---

### Phase 10: Testing, Polish & Launch Preparation (Weeks 17-20)

**Objective**: Comprehensive testing, bug fixes, and production readiness

**Deliverables:**
1. Complete test coverage
2. Performance optimization
3. Security audit
4. App Store submissions
5. Production deployment

**Backend Tasks:**
- [ ] Achieve 80%+ unit test coverage
- [ ] Write integration tests for critical flows
- [ ] Load testing (simulate 10,000 concurrent users)
- [ ] Performance optimization (query optimization, caching)
- [ ] Security audit (OWASP top 10)
- [ ] API rate limiting implementation
- [ ] Production database migration and backup strategy
- [ ] Set up monitoring and alerting
- [ ] Create runbooks for common operations

**Mobile App Tasks:**
- [ ] End-to-end testing (Detox)
- [ ] Manual testing on physical devices (iOS and Android)
- [ ] Performance optimization (reduce app size, lazy loading)
- [ ] Offline support testing
- [ ] Accessibility improvements (screen readers, contrast)
- [ ] App icon and splash screen design
- [ ] App Store assets (screenshots, descriptions)
- [ ] Beta testing (TestFlight for iOS, Play Console for Android)
- [ ] Handle beta feedback and bug fixes

**Admin Panel Tasks:**
- [ ] Browser compatibility testing
- [ ] Responsive design testing
- [ ] User acceptance testing (UAT) with stakeholders

**DevOps & Infrastructure:**
- [ ] Set up production environment (AWS/DigitalOcean)
- [ ] Configure auto-scaling and load balancing
- [ ] Set up database replication and backups
- [ ] Configure CDN for static assets
- [ ] SSL certificate setup
- [ ] Set up monitoring (Datadog, CloudWatch)
- [ ] Set up error tracking (Sentry)
- [ ] Create disaster recovery plan

**App Store Submission:**
- [ ] Apple App Store submission (iOS)
  - [ ] App Store Connect setup
  - [ ] App metadata and screenshots
  - [ ] Privacy policy and terms of service
  - [ ] Submit for review
- [ ] Google Play Store submission (Android)
  - [ ] Play Console setup
  - [ ] App metadata and screenshots
  - [ ] Submit for review

**Success Criteria:**
- All critical bugs fixed
- Test coverage meets targets
- Performance benchmarks achieved
- Security audit passed
- Apps approved on both stores
- Production environment stable and monitored

---

## 5. Sprint Breakdown

### Two-Week Sprint Structure

Each sprint includes:
- **Sprint Planning**: Define goals and tasks
- **Daily Standups**: 15-min sync meetings
- **Development**: Coding, testing, code reviews
- **Sprint Review**: Demo to stakeholders
- **Sprint Retrospective**: Team improvement discussion

**Sprint Schedule:**
- **Sprint 1-2**: Foundation & Setup, Authentication
- **Sprint 3-4**: Tournament Management, Match Scheduling
- **Sprint 5-6**: User Entry, Prediction Submission
- **Sprint 7-8**: Scoring Engine, Leaderboard
- **Sprint 9**: Notifications, Tournament-End
- **Sprint 10**: Testing & Launch Prep

---

## 6. Team Structure

### Recommended Team Composition

**Core Team (7-9 people):**

1. **Project Manager / Product Owner** (1)
   - Manages timeline, scope, stakeholder communication
   - Prioritizes backlog and feature requirements

2. **Backend Developers** (2)
   - Node.js/TypeScript expertise
   - Database design and optimization
   - API development and documentation

3. **Mobile Developers** (2)
   - React Native or Flutter expertise
   - iOS and Android platform knowledge
   - Mobile UI/UX implementation

4. **Frontend Developer** (1)
   - React expertise for admin panel
   - Responsive design skills

5. **QA Engineer** (1)
   - Test planning and execution
   - Automated testing setup
   - Bug tracking and regression testing

6. **DevOps Engineer** (1)
   - CI/CD pipeline management
   - Cloud infrastructure setup and maintenance
   - Monitoring and performance optimization

7. **UI/UX Designer** (1)
   - Mobile app design
   - Admin panel design
   - User flow and wireframing

**Extended Team (as needed):**
- Security Consultant (for audit)
- Payment Integration Specialist
- Cricket Domain Expert (for rule validation)

### Team Responsibilities Matrix

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 | Phase 9 | Phase 10 |
|------|---------|---------|---------|---------|---------|---------|---------|---------|---------|----------|
| PM | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ |
| Backend | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ |
| Mobile | ████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ |
| Frontend | ████ | ████ | ██████ | ██████ | ██████ | ████ | ██████ | ██████ | ████ | ██████ |
| QA | ██ | ██ | ████ | ████ | ██████ | ██████ | ██████ | ██████ | ██████ | ██████ |
| DevOps | ██████ | ████ | ██ | ██ | ████ | ██ | ██ | ██ | ████ | ██████ |
| Designer | ██████ | ██████ | ██████ | ████ | ████ | ████ | ██ | ██ | ██ | ████ |

---

## 7. Risk Management

### Identified Risks and Mitigation Strategies

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Complex Scoring Logic Errors** | High | Critical | • Extensive unit testing<br>• Create scoring simulation tool<br>• Beta test with real users<br>• Implement admin score recalculation feature |
| **Payment Integration Issues** | Medium | High | • Use battle-tested Stripe SDK<br>• Implement webhook verification<br>• Extensive testing in sandbox<br>• Have manual payment entry fallback |
| **App Store Rejection** | Medium | High | • Follow platform guidelines strictly<br>• Submit early for review<br>• Have legal review (gambling concerns)<br>• Prepare appeals if needed |
| **Performance Issues (Concurrent Users)** | Medium | High | • Load testing before launch<br>• Implement caching (Redis)<br>• Database query optimization<br>• Set up auto-scaling |
| **Timeline Delays** | High | Medium | • Buffer time in estimates (20%)<br>• Prioritize MVP features<br>• Parallel development tracks<br>• Regular progress reviews |
| **Scope Creep** | High | Medium | • Strict PRD adherence<br>• Change request process<br>• Defer Phase 2 features<br>• Product owner approval required |
| **Team Turnover** | Low | High | • Document everything<br>• Code reviews for knowledge sharing<br>• Onboarding documentation<br>• Pair programming |
| **Third-Party API Failures** (Auth, Payment) | Low | Critical | • Implement retry logic<br>• Fallback mechanisms<br>• Monitor API status<br>• Have support contacts |
| **Security Breach** | Low | Critical | • Regular security audits<br>• Follow OWASP guidelines<br>• Implement rate limiting<br>• Have incident response plan |
| **Database Data Loss** | Low | Critical | • Automated daily backups<br>• Point-in-time recovery setup<br>• Backup restoration testing<br>• Multi-region replication (optional) |

---

## 8. Testing Strategy

### 8.1 Backend Testing

**Unit Testing (80%+ coverage):**
- Jest for unit tests
- Test all service layer functions
- Mock database calls
- Focus on scoring engine (critical)

**Integration Testing:**
- Test API endpoints end-to-end
- Test database transactions
- Test third-party integrations (Stripe, Firebase)

**Load Testing:**
- Apache JMeter or Artillery
- Simulate 10,000 concurrent users
- Test during peak times (match start)

**Security Testing:**
- OWASP ZAP for vulnerability scanning
- SQL injection testing
- XSS attack testing
- Rate limiting verification

### 8.2 Mobile App Testing

**Unit Testing:**
- Jest for business logic
- React Native Testing Library for components

**Integration Testing:**
- Test user flows (registration, prediction, payment)
- Test API integration

**End-to-End Testing:**
- Detox for automated E2E tests
- Test critical flows on both iOS and Android

**Manual Testing:**
- Device testing (multiple iOS and Android devices)
- Different screen sizes and OS versions
- Network conditions (3G, 4G, WiFi, offline)

**Beta Testing:**
- TestFlight for iOS (100 beta testers)
- Play Console for Android (closed beta)
- Collect feedback and bug reports

### 8.3 Admin Panel Testing

**Unit Testing:**
- Jest for React components

**Integration Testing:**
- Test CRUD operations
- Test file uploads

**Browser Testing:**
- Chrome, Firefox, Safari, Edge
- Responsive design testing

**User Acceptance Testing (UAT):**
- Stakeholder testing
- Real admin user testing
- Feedback collection

### 8.4 Test Scenarios (Critical Flows)

**User Registration & Entry:**
1. User logs in with Facebook/Google
2. User selects tournament
3. User selects season team
4. User makes tournament-end predictions
5. User pays $50 entry fee
6. Verify user entry created and payment recorded

**Prediction Submission:**
1. User views upcoming match
2. User submits prediction (winner, MoM, score, wickets)
3. User edits prediction before deadline
4. Verify prediction cannot be submitted after deadline

**Match Result & Scoring:**
1. Admin enters match result
2. System calculates points for all users
3. Verify correct points distribution (base + bonuses - penalties)
4. Verify season team adjustments
5. Verify leaderboard updates

**Complex Scoring Scenarios:**
- League match, season team wins, user predicted correctly
- Playoff match, season team loses, user predicted against season team
- Reduced overs match (score/wickets don't count)
- Super over match (winner still gets points)
- Final match scoring

**Tournament Completion:**
1. Admin enters tournament-end results (HRG, HWT, POT)
2. System calculates final bonuses
3. System generates final standings
4. Verify prize distribution

---

## 9. Deployment Strategy

### 9.1 Environments

**Local Development:**
- Docker Compose for backend, database, Redis
- React Native on physical devices/emulators
- Local admin panel (Vite dev server)

**Development (Dev):**
- Auto-deploy on push to `develop` branch
- Shared environment for all developers
- Test data and sandbox payment

**Staging:**
- Production-like environment
- Deploy from `release/*` branches
- Used for QA and UAT
- Production data subset (anonymized)

**Production:**
- Deploy from `main` branch (manual approval)
- Auto-scaling enabled
- Real payment processing
- Monitoring and alerting

### 9.2 Backend Deployment

**Infrastructure:**
- AWS EC2 or ECS (containerized)
- Application Load Balancer
- RDS for PostgreSQL
- ElastiCache for Redis
- S3 for file storage
- CloudFront CDN

**Deployment Process:**
1. Code merged to `main` branch
2. GitHub Actions triggers build
3. Run tests and linting
4. Build Docker image
5. Push image to ECR (Elastic Container Registry)
6. Deploy to ECS (blue/green deployment)
7. Run database migrations
8. Smoke tests
9. Route traffic to new version

**Rollback Strategy:**
- Keep previous 3 versions
- One-click rollback in AWS console
- Database migration rollback scripts

### 9.3 Mobile App Deployment

**iOS (App Store):**
1. Code merged to `main`
2. Fastlane builds IPA file
3. Upload to App Store Connect
4. Manual release or phased rollout
5. Monitor crash reports

**Android (Play Store):**
1. Code merged to `main`
2. Fastlane builds AAB file
3. Upload to Play Console
4. Staged rollout (10% → 50% → 100%)
5. Monitor crash reports

**Over-the-Air (OTA) Updates:**
- CodePush or Expo Updates (for minor updates)
- Skip app store review for bug fixes

### 9.4 Admin Panel Deployment

**Hosting:**
- AWS S3 + CloudFront (static site)
- Or Vercel/Netlify (recommended for simplicity)

**Deployment Process:**
1. Code merged to `main`
2. GitHub Actions builds production bundle
3. Deploy to S3/Vercel
4. CloudFront cache invalidation
5. DNS update (if needed)

### 9.5 Database Migrations

**Migration Strategy:**
- Use Prisma Migrate or TypeORM migrations
- Version-controlled migration files
- Run migrations before app deployment
- Test migrations on staging first
- Keep rollback migrations

**Zero-Downtime Migrations:**
- Backward-compatible changes first
- Deploy app version that works with old and new schema
- Run migration
- Deploy new app version
- Remove old schema support

### 9.6 Monitoring & Alerting

**Application Monitoring:**
- Sentry for error tracking
- Datadog or CloudWatch for metrics
- Log aggregation (CloudWatch Logs or ELK)

**Alerts:**
- API error rate > 1%
- Response time > 1 second
- Database connection pool exhausted
- Payment failure rate > 5%
- App crash rate > 2%

**Dashboards:**
- Real-time user count
- API request rate
- Database performance
- Payment transactions
- Error rates

---

## 10. Timeline and Milestones

### High-Level Timeline (20 weeks for MVP)

```
Week 1-2:   Foundation & Setup
Week 3-4:   Authentication & User Management
Week 5-6:   Tournament & Team Management
Week 7-8:   Match Scheduling & Fixtures
Week 9-10:  User Entry & Payment
Week 11-12: Prediction Submission
Week 13-14: Scoring Engine
Week 15:    Leaderboard & Dashboard
Week 16:    Notifications & Tournament-End
Week 17-18: Testing & Bug Fixes
Week 19:    App Store Submissions
Week 20:    Production Launch
```

### Major Milestones

| Milestone | Week | Deliverable | Success Criteria |
|-----------|------|-------------|------------------|
| **M1: Foundation Complete** | 2 | Development environment setup | All developers can run project locally |
| **M2: Authentication Live** | 4 | Login with Facebook/Google | Users can register and log in |
| **M3: Admin Panel Functional** | 6 | Tournament/team/player management | Admin can create tournament data |
| **M4: Fixtures Visible** | 8 | Match scheduling and display | Users can view 32-match schedule |
| **M5: Payment Integration** | 10 | Entry fee collection | Users can pay and register |
| **M6: Predictions Enabled** | 12 | Prediction submission | Users can submit and edit predictions |
| **M7: Scoring Engine Live** | 14 | Automated point calculation | Points calculated correctly for all scenarios |
| **M8: Beta Release** | 16 | All features complete | Beta testers can use full app |
| **M9: App Store Submission** | 19 | Apps submitted for review | Awaiting approval |
| **M10: Production Launch** | 20 | Apps live on stores | Public launch |

### Launch Checklist

**Pre-Launch (Week 19):**
- [ ] All critical bugs fixed
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Terms of service and privacy policy finalized
- [ ] Customer support plan ready
- [ ] Marketing materials prepared
- [ ] Beta testing feedback incorporated
- [ ] Load testing completed
- [ ] Production environment configured
- [ ] Monitoring and alerting set up

**Launch Day (Week 20):**
- [ ] App Store and Play Store apps live
- [ ] Backend deployed to production
- [ ] Database migrated and backed up
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Payment gateway in live mode
- [ ] Push notifications working
- [ ] Monitoring dashboards active
- [ ] Customer support team ready
- [ ] Social media announcement
- [ ] Press release (if applicable)

**Post-Launch (Week 21+):**
- [ ] Monitor error rates and crashes
- [ ] Respond to user feedback and reviews
- [ ] Fix critical bugs immediately
- [ ] Plan for first update (bug fixes)
- [ ] Track user engagement metrics
- [ ] Prepare for first tournament

---

## 11. Post-MVP Roadmap

### Phase 2 Features (3-6 months post-launch)

**Social Features:**
- Friend leagues (create private leagues)
- Social sharing (share predictions, results)
- Chat and messaging
- Achievements and badges

**Enhanced Analytics:**
- User performance analytics
- Prediction patterns and insights
- Team and player statistics
- Historical data comparison

**Gamification:**
- Streak bonuses (consecutive correct predictions)
- Daily challenges
- Rewards and loyalty program
- Referral program

**Multi-Tournament Support:**
- Support for IPL, BBL, other leagues
- Cross-tournament leaderboards
- Bundle pricing for multiple tournaments

### Phase 3 Features (6-12 months post-launch)

**AI & Machine Learning:**
- AI-powered prediction suggestions
- Player performance predictions
- Match outcome probabilities

**Content Integration:**
- Live match updates
- Video highlights
- News and articles
- Social media integration

**Monetization Expansion:**
- Subscription tiers (premium features)
- In-app purchases (power-ups, hints)
- Advertising (non-intrusive)
- Merchandise store

**Platform Expansion:**
- Web app for predictions
- Progressive Web App (PWA)
- Smart TV app
- White-label solution for other sports

---

## 12. Appendix

### 12.1 Useful Commands

**Backend:**
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run database migrations
npm run migrate

# Build for production
npm run build

# Start production server
npm start
```

**Mobile App:**
```bash
# Install dependencies
npm install

# iOS: Install pods
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Build iOS (via Fastlane)
fastlane ios beta

# Build Android (via Fastlane)
fastlane android beta
```

**Admin Panel:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 12.2 Key Documentation Links

- React Native: https://reactnative.dev/
- NestJS: https://nestjs.com/
- Prisma: https://www.prisma.io/
- Stripe API: https://stripe.com/docs/api
- Firebase: https://firebase.google.com/docs
- PostgreSQL: https://www.postgresql.org/docs/

### 12.3 Naming Conventions

**Git Branches:**
- `feature/authentication-flow`
- `bugfix/payment-error-handling`
- `hotfix/scoring-calculation`
- `release/v1.0.0`

**API Endpoints:**
- `GET /api/v1/tournaments`
- `POST /api/v1/predictions`
- `PUT /api/v1/users/me`

**Database Tables:**
- Lowercase with underscores: `user_entries`, `match_predictions`

**React Components:**
- PascalCase: `MatchPredictionForm`, `LeaderboardScreen`

**Functions:**
- camelCase: `calculateMatchPoints`, `validatePrediction`

### 12.4 Version Control Strategy

**Branching Model:** Git Flow

**Main Branches:**
- `main`: Production-ready code
- `develop`: Integration branch for features

**Supporting Branches:**
- `feature/*`: New features
- `release/*`: Release preparation
- `hotfix/*`: Production bug fixes

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Example:**
```
feat(predictions): add deadline validation

Prevent users from submitting predictions after match start time.
Includes error messaging and UI updates.

Closes #123
```

---

## Document Control

**Author:** Development Team  
**Reviewers:** Product Manager, Tech Lead, Stakeholders  
**Next Review Date:** Every sprint (2 weeks)  
**Version History:**
- v1.0 (Nov 15, 2025): Initial development plan

---

**End of Development Plan**

