# Product Requirements Document (PRD)
## NPL Fantasy Predictor Application

**Version:** 1.0  
**Date:** November 15, 2025  
**Status:** Draft

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Goals and Objectives](#goals-and-objectives)
3. [Target Audience](#target-audience)
4. [Tournament Structure](#tournament-structure)
5. [Game Logic and Scoring System](#game-logic-and-scoring-system)
6. [Functional Requirements](#functional-requirements)
7. [User Roles and Permissions](#user-roles-and-permissions)
8. [Technical Requirements](#technical-requirements)
9. [Success Metrics](#success-metrics)
10. [Constraints and Assumptions](#constraints-and-assumptions)

---

## 1. Executive Summary

The NPL Fantasy Predictor Application is a mobile-first platform that enables users to participate in cricket tournament predictions. Users pay an entry fee, make predictions for each match, and earn points based on accuracy. The application supports a complete 32-game tournament structure with league matches and playoffs, featuring real-time scoring, bonuses, penalties, and comprehensive tournament information.

---

## 2. Goals and Objectives

### Primary Goals
- Create a functional mobile application for cricket tournament prediction
- Enable users to register, pay entry fees, and submit match predictions
- Calculate and display real-time points, bonuses, and penalties
- Provide comprehensive tournament viewing and tracking features

### Business Objectives
- Generate revenue through $50 entry fees and penalty fees
- Create an engaging, competitive environment for cricket fans
- Build a scalable platform that can support multiple tournaments

### User Objectives
- Easy tournament participation and prediction submission
- Real-time tracking of points and leaderboard position
- Access to comprehensive tournament and player information
- Fair and transparent scoring system

---

## 3. Target Audience

### Primary Users
- **Cricket Enthusiasts**: Ages 18-45, interested in NPL cricket
- **Fantasy Sports Players**: Users familiar with prediction-based games
- **Social Gamers**: Users who enjoy competitive social experiences

### Geographic Focus
- Primary: Nepal and regions with NPL cricket following
- Secondary: Global cricket fans with interest in NPL

---

## 4. Tournament Structure

### Fixed Structure (Non-negotiable)
- **Total Games**: 32 matches per tournament
  - **League Matches**: 28 games
  - **Playoffs**: 4 games (including finals)

### Tournament Timeline
- Matches scheduled according to official NPL calendar
- Users must submit predictions before match start time
- Results processed within 24 hours of match completion

---

## 5. Game Logic and Scoring System

### 5.1 Entry Requirements

| Requirement | Value | Rules |
|------------|-------|-------|
| Entry Fee | $50 | • Non-refundable<br>• Required before season start<br>• One-time payment per tournament |
| Season Team Selection | 1 team | • Must be selected at registration<br>• Cannot be changed mid-season<br>• Affects scoring throughout tournament |

### 5.2 Match Outcome Scoring

Points and penalties vary by match stage:

| Match Stage | Win Points | Loss Points | Penalty Fee for Loss |
|-------------|-----------|-------------|---------------------|
| League Matches | 3 points | 0 points | $2 penalty |
| Playoffs | 5 points | 0 points | $3 penalty |
| Final | 7 points | 0 points | $5 penalty |

**Rules:**
- Users predict the winning team for each match
- Points awarded only for correct predictions
- Penalty fee charged for incorrect predictions
- Penalties accumulate and are deducted from potential winnings

### 5.3 Season Team Bonus/Penalty System

The selected season team affects scoring throughout the tournament:

| Condition | Point Adjustment | Notes |
|-----------|-----------------|-------|
| Season team wins (and user predicted correctly) | +1 bonus point | Added to base match points |
| Season team loses (any user prediction) | -1 point | Applied regardless of user's prediction |

**"Going Against" Season Team Logic:**
- If user predicts against their season team and wins:
  - Gets base points only (no +1 bonus)
  - Still receives -1 penalty if season team loses
- **Example**: Karnali (season team) loses, user picks Pokhara (winner)
  - League match: 3 (base) - 1 (season team loss) = **2 points**
  - Playoff: 5 (base) - 1 (season team loss) = **4 points**

### 5.4 Match-Specific Prediction Bonuses

Users can earn additional points through detailed predictions:

| Prediction Type | Points | Rules |
|----------------|--------|-------|
| Man of the Match (MoM) | +1 point | Must predict correct player |
| 1st Innings Score Category | +1 point | Must match the correct category (A-F)<br>• No penalty for wrong prediction |
| 1st Innings Wickets | +1 point | Must match exact wicket count<br>• No penalty for wrong prediction |

**Score Categories (A-F):**
- Category A: 0-100 runs
- Category B: 101-130 runs
- Category C: 131-160 runs
- Category D: 161-190 runs
- Category E: 191-220 runs
- Category F: 221+ runs

### 5.5 Match Validity Rules

The system must apply these rules when calculating scores:

| Condition | Rule | Impact |
|-----------|------|--------|
| Normal Match | First innings score and wickets count | Full scoring applies |
| Reduced Overs Match | First innings score DOES NOT count | Only match outcome counts |
| Draw/Cancelled Match | First innings score DOES NOT count | Match may be voided or outcome determined by officials |
| Super Over / DLS Applied | Winning team determined by final result | Match outcome points still awarded |

**Critical Rules:**
- Only first innings considered (not chase innings)
- Reduced overs = Score predictions void
- Draw/cancelled/reduced = Score predictions void
- Super over/DLS = Winner still gets points

### 5.6 Tournament-End Bonuses

Awarded after tournament completion:

| Prediction Category | Bonus Points | When Awarded |
|---------------------|-------------|--------------|
| Season Team Wins NPL Title | +5 points | If selected season team wins championship |
| Highest Run Getter (HRG) | +5 points | If predicted player scores most runs |
| Highest Wicket Taker (HWT) | +5 points | If predicted player takes most wickets |
| Player of the Tournament (POT) | +5 points | If predicted player wins award |

**Rules:**
- Predictions must be submitted before tournament start
- Cannot be changed after first match begins
- Bonus awarded to all users who predicted correctly

### 5.7 Scoring Calculation Example

**Scenario**: League match - User's season team is Karnali, user predicts Pokhara
- Match Result: Pokhara wins, Karnali loses
- User predicted: MoM correctly, Score category correctly, Wickets incorrectly
- First innings valid (not reduced overs)

**Point Calculation:**
```
Base points (correct prediction):        +3
Season team loss penalty:                -1
MoM bonus:                               +1
Score category bonus:                    +1
Wickets bonus:                            0
-------------------------------------------
Total:                                    4 points
Penalty fee charged:                     $0 (prediction was correct)
```

---

## 6. Functional Requirements

### 6.1 Home Page (Public View)

**Purpose**: Central hub for tournament information and app access

**Features Required:**

1. **Tournament Listing**
   - Display current and upcoming T20 tournaments
   - Show tournament metadata:
     - Tournament name
     - Country
     - Start/end dates
     - Tournament status (upcoming/live/completed)

2. **Tournament Information Pages**
   - **Teams**: List all participating teams with logos and basic info
   - **Players**: Team-wise player listings with:
     - Player name, photo, role (batsman/bowler/all-rounder)
     - Statistics (if available): runs, wickets, average, strike rate
     - Player details page (requires authentication)
   - **Fixtures & Results**: ESPN Cricinfo-style display showing:
     - Match schedule (date, time, venue, teams)
     - Match results (scores, winner, MoM)
     - Tie sheet / tournament bracket
     - Match status (upcoming/live/completed)

3. **Authentication Access**
   - Prominent Login button
   - Facebook/Gmail authentication options

4. **App Distribution**
   - Visible links/buttons for:
     - Google Play Store
     - Apple App Store

**User Experience:**
- Mobile-optimized responsive design
- Fast loading with cached data
- Intuitive navigation between sections

### 6.2 Admin Panel (Web-Based Backend)

**Purpose**: Backend management for tournament data and operations

**Access Control:**
- Secure admin login required
- Role-based access control (Super Admin, Tournament Admin)

**CRUD Operations Required:**

1. **Tournament Management**
   - Create new tournaments
   - Edit tournament details (name, dates, rules)
   - Set tournament status (draft/active/completed)
   - Delete/archive tournaments

2. **Team Management**
   - Add teams with details (name, logo, home ground)
   - Update team information
   - Assign players to teams
   - Remove/deactivate teams

3. **Player Management**
   - Add players with details (name, photo, role, stats)
   - Update player information
   - Transfer players between teams
   - Deactivate players

4. **Schedule Management**
   - Create match schedules (date, time, venue, teams)
   - Update match timings
   - Reschedule or cancel matches
   - Set match types (league/playoff/final)

5. **Results Management**
   - Enter match results:
     - Winner and loser
     - First innings score and wickets
     - Man of the Match
     - Match notes (reduced overs, super over, etc.)
   - Update/correct results
   - Trigger scoring recalculation

6. **Bet Management**
   - Create prediction options for each match:
     - Enable/disable specific prediction types
     - Set prediction deadlines
     - Configure bonus categories
   - Lock predictions at match start

7. **User Management**
   - View registered users
   - Manage user entries and payments
   - Handle refunds/disputes
   - Ban/suspend users

8. **Financial Dashboard**
   - View entry fee collections
   - Track penalty fees
   - Generate financial reports
   - Manage prize pool distribution

**Technical Requirements:**
- RESTful API backend
- Secure authentication (JWT or session-based)
- Database backup before major operations
- Audit log for all admin actions

### 6.3 User Dashboard (Authenticated Users)

**Purpose**: Personalized hub for user's tournament participation

**Dynamic Content Based on User State:**

#### 6.3.1 Non-Participating User View

**When**: User is logged in but not registered for any active tournaments

**Display:**
1. **Available Tournaments**
   - List of open tournaments accepting registrations
   - Tournament details (dates, entry fee, prize pool)
   - "Register Now" button

2. **Invitations** (if applicable)
   - Pending tournament invitations
   - Invitation details (inviter, game rules, participants)
   - Accept/Decline actions

3. **Create Tournament** (if admin privileges)
   - Button to create private tournament
   - Configure custom rules and invite users

#### 6.3.2 Participating User View

**When**: User has registered and paid for a tournament

**Display:**

1. **Tournament Overview**
   - Current tournament name and status
   - User's total points and rank
   - Prize pool and potential winnings
   - Days/matches remaining

2. **Battle Stats (Prediction History)**
   - Match-by-match breakdown:
     - Match info (teams, date)
     - User's predictions (winner, MoM, score, wickets)
     - Actual results
     - Points earned/lost
     - Penalties incurred
   - Filter by: All matches / Completed / Upcoming / League / Playoffs
   - Sorting options: Chronological / Points earned

3. **Leaderboard**
   - User's current rank
   - Top 10 players with points
   - User's position highlighted
   - Friends' positions (if social features enabled)

4. **Current Day Battle Form**
   - **Upcoming Matches Requiring Predictions**:
     - Match details (teams, date, time)
     - Countdown to prediction deadline
     - Prediction form:
       - Select winning team (required)
       - Select Man of the Match (optional)
       - Select first innings score category (optional)
       - Select first innings wickets (optional)
     - Submit button
     - Save draft functionality
   - **Submitted Predictions**:
     - View predictions for upcoming matches
     - Edit predictions (before deadline)
     - Lock status indicator

5. **Season Team Performance**
   - Selected season team display
   - Season team's record (wins/losses)
   - Impact on user's total points (bonuses/penalties)

6. **Financial Summary**
   - Entry fee paid: $50
   - Accumulated penalties: $X
   - Net balance: Entry fee - penalties
   - Potential winnings (based on current rank)

7. **Tournament-End Predictions** (before season starts)
   - Season team selection (locked after first match)
   - Highest Run Getter prediction
   - Highest Wicket Taker prediction
   - Player of the Tournament prediction
   - Edit functionality (before tournament starts)

**User Experience:**
- Real-time updates when matches complete
- Push notifications for:
  - Prediction deadlines approaching
  - Match results available
  - Leaderboard position changes
- Pull-to-refresh for latest data
- Offline viewing of submitted predictions

### 6.4 Prediction Submission Flow

**Trigger**: User clicks on upcoming match or "Submit Prediction"

**Steps:**

1. **Match Information Display**
   - Team A vs Team B
   - Date and time
   - Venue
   - Current team form/statistics

2. **Required Prediction**
   - Select winning team (Team A or Team B)
   - Visual selection (tap team card)

3. **Optional Predictions** (can be skipped)
   - Select Man of the Match (dropdown of all players)
   - Select first innings score category (A-F buttons)
   - Select first innings wickets (0-10 dropdown)

4. **Review & Submit**
   - Summary of all predictions
   - Confirmation modal: "Predictions can be edited until match starts"
   - Submit button

5. **Confirmation**
   - Success message
   - Return to dashboard
   - Prediction visible in "Submitted" section

**Validation Rules:**
- Winning team selection is mandatory
- Predictions cannot be submitted after match start time
- User cannot skip match (must predict all matches)
- Confirmation required before final submission

### 6.5 Scoring and Results Flow

**Trigger**: Admin enters match result

**Backend Process:**

1. **Match Result Entry** (Admin Panel)
   - Admin enters:
     - Winner
     - First innings score and wickets
     - Man of the Match
     - Match conditions (normal/reduced overs/cancelled)
   - System validates data

2. **Automated Scoring Calculation**
   - For each user who predicted this match:
     - Calculate base points (win/loss)
     - Apply season team adjustment (±1)
     - Calculate bonus points (MoM, score, wickets)
     - Apply penalty fees
     - Update user's total points
   - Recalculate leaderboard rankings

3. **User Notification**
   - Push notification: "Match result available - you earned X points!"
   - In-app notification badge

4. **Result Display**
   - Match marked as "Completed" in fixtures
   - User's prediction history updated with:
     - Result indicators (✓ correct, ✗ incorrect)
     - Points earned/lost
     - Detailed breakdown

**Data Integrity:**
- Transaction-based updates (all-or-nothing)
- Audit trail for scoring calculations
- Admin ability to recalculate if error detected

---

## 7. User Roles and Permissions

### 7.1 User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Super Admin** | System-wide administrator | • Full CRUD on all data<br>• User management<br>• Financial access<br>• System configuration |
| **Tournament Admin** | Manages specific tournament | • CRUD on assigned tournament<br>• Results entry<br>• Bet management<br>• View participants |
| **Registered User** | Paid participant | • Submit predictions<br>• View own stats<br>• View leaderboard<br>• View tournament info |
| **Guest User** | Unauthenticated visitor | • View tournaments<br>• View fixtures<br>• View public info<br>• Cannot view player details |

### 7.2 Permission Matrix

| Feature | Guest | Registered User | Tournament Admin | Super Admin |
|---------|-------|----------------|------------------|-------------|
| View tournaments | ✓ | ✓ | ✓ | ✓ |
| View fixtures | ✓ | ✓ | ✓ | ✓ |
| View player details | ✗ | ✓ | ✓ | ✓ |
| Register for tournament | ✗ | ✓ | ✓ | ✓ |
| Submit predictions | ✗ | ✓ (own) | ✓ | ✓ |
| View leaderboard | ✗ | ✓ | ✓ | ✓ |
| Enter match results | ✗ | ✗ | ✓ (own tournament) | ✓ |
| Manage tournament data | ✗ | ✗ | ✓ (own tournament) | ✓ |
| User management | ✗ | ✗ | ✗ | ✓ |
| Financial access | ✗ | ✗ (own summary) | ✗ | ✓ |

---

## 8. Technical Requirements

### 8.1 Platform Support

**Mobile Application:**
- **iOS**: iOS 14.0 and above
- **Android**: Android 8.0 (API 26) and above
- **Framework**: React Native or Flutter (cross-platform)

**Web Application (Admin Panel):**
- **Desktop browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Responsive**: Tablet support (optional mobile web for admin)

### 8.2 Authentication

**Requirements:**
- OAuth 2.0 integration for:
  - Facebook Login
  - Google Sign-In
- One account type per user (prevent duplicate accounts)
- Secure token storage (device keychain/secure storage)
- Session management (30-day expiry)
- Logout functionality

### 8.3 Data Requirements

**Database:**
- Relational database (PostgreSQL or MySQL)
- Minimum entities:
  - Users
  - Tournaments
  - Teams
  - Players
  - Matches
  - Predictions
  - Results
  - Transactions (payments/penalties)

**Data Integrity:**
- Foreign key constraints
- Transaction support for multi-table updates
- Backup strategy (daily automated backups)
- Data retention: Minimum 2 years for completed tournaments

**API:**
- RESTful API architecture
- JSON data format
- Rate limiting (prevent abuse)
- API versioning (/api/v1/)

### 8.4 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| App Load Time | < 3 seconds | Time to interactive on 4G connection |
| API Response Time | < 500ms | 95th percentile for read operations |
| Prediction Submission | < 2 seconds | End-to-end submission time |
| Real-time Updates | < 5 seconds | Delay from result entry to user notification |
| Concurrent Users | 10,000+ | Users active during match time |
| Data Sync | < 30 seconds | Time to sync match results to all devices |

### 8.5 Security Requirements

**Data Protection:**
- HTTPS/TLS 1.3 for all communications
- Encrypted storage for sensitive data
- PCI DSS compliance for payment processing
- GDPR compliance for user data

**Authentication & Authorization:**
- JWT tokens with expiry
- Role-based access control (RBAC)
- Two-factor authentication for admin accounts (optional)
- Rate limiting on login attempts

**Audit & Compliance:**
- Audit logs for all financial transactions
- Admin action logs
- User consent for data collection
- Terms of service and privacy policy acceptance

### 8.6 Payment Integration

**Payment Gateway:**
- Stripe or PayPal integration
- Support for credit/debit cards
- Local payment methods (as per target region)

**Financial Tracking:**
- Entry fee collection ($50)
- Penalty fee tracking (per match)
- Prize pool calculation
- Automated payout system (optional for MVP)

### 8.7 Notification System

**Push Notifications:**
- Firebase Cloud Messaging (Android)
- Apple Push Notification Service (iOS)

**Notification Types:**
- Match prediction reminders (30 min before deadline)
- Match results available
- Leaderboard updates (daily)
- Tournament start/end
- Payment confirmations
- Admin announcements

### 8.8 Third-Party Integrations

**Optional but Recommended:**
- Cricket API for live scores (CricAPI or similar)
- Analytics (Firebase Analytics or Mixpanel)
- Crash reporting (Sentry or Firebase Crashlytics)
- Customer support (Intercom or Zendesk)

---

## 9. Success Metrics

### 9.1 Business Metrics

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| User Registrations | 1,000+ users | Per tournament |
| Entry Fee Revenue | $50,000+ | Per tournament |
| Completion Rate | 80%+ | Users who complete all predictions |
| User Retention | 60%+ | Users who join next tournament |
| Payment Success Rate | 95%+ | Successful transactions |

### 9.2 Engagement Metrics

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| Daily Active Users (DAU) | 70%+ | During tournament |
| Prediction Submission Rate | 90%+ | Per match |
| Time to Submit Prediction | < 3 minutes | Average per user |
| App Session Length | 5-10 minutes | Average per session |
| Leaderboard Views | 3+ times | Per user per day |

### 9.3 Technical Metrics

| Metric | Target | Measurement Period |
|--------|--------|-------------------|
| App Crash Rate | < 1% | Per session |
| API Error Rate | < 0.5% | Per 1000 requests |
| App Rating | 4.0+ stars | App Store / Play Store |
| Page Load Time | < 3 seconds | 95th percentile |
| Push Notification Delivery | 95%+ | Successfully delivered |

### 9.4 User Satisfaction

- **NPS Score**: 40+ (measured via in-app survey)
- **Support Tickets**: < 5% of users require support
- **Feature Requests**: Track and prioritize for future releases

---

## 10. Constraints and Assumptions

### 10.1 Constraints

**Technical:**
- Must work on both iOS and Android
- Must handle concurrent users during peak match times
- Must calculate scores accurately according to complex rules
- Payment gateway compliance requirements

**Business:**
- Entry fee is fixed at $50
- Tournament structure (32 games) is non-negotiable
- Scoring rules are fixed and cannot be changed mid-tournament

**Legal:**
- Must comply with gambling regulations (if applicable in target regions)
- Age restriction: 18+ users only
- Terms of service must be accepted before payment

**Timeline:**
- MVP must be ready before next NPL season
- Admin panel required before mobile app launch
- Testing period required with beta users

### 10.2 Assumptions

**User Behavior:**
- Users have smartphones with internet access
- Users are familiar with cricket and NPL
- Users will submit predictions before deadlines
- Users understand the scoring system

**Technical:**
- Third-party APIs (Facebook, Google, Payment) remain available
- Cricket match data can be obtained (manually or via API)
- Cloud hosting services remain operational
- No major platform changes (iOS/Android) during development

**Business:**
- Sufficient user interest in NPL fantasy predictions
- Tournament schedule is published in advance
- Official match results are available within 24 hours
- Payment processing fees are acceptable

**Operational:**
- Admin resources available to enter results
- Customer support available during tournament
- Legal clearance for operating in target regions

---

## 11. Future Enhancements (Out of Scope for MVP)

**Phase 2 Features:**
- Social features (friend leagues, challenges)
- Live match updates and commentary
- Player statistics and analytics
- Multiple tournament support (IPL, BBL, etc.)
- In-app chat and community features

**Phase 3 Features:**
- AI-powered prediction suggestions
- Video highlights integration
- Merchandise store
- Referral and rewards program
- White-label solution for other tournaments

---

## 12. Appendix

### 12.1 Glossary

- **NPL**: Nepal Premier League (cricket tournament)
- **MoM**: Man of the Match
- **HRG**: Highest Run Getter
- **HWT**: Highest Wicket Taker
- **POT**: Player of the Tournament
- **DLS**: Duckworth-Lewis-Stern method
- **MVP**: Minimum Viable Product
- **CRUD**: Create, Read, Update, Delete

### 12.2 References

- Source documentation provided by stakeholders
- Cricket scoring rules and regulations
- Payment gateway documentation
- Mobile app platform guidelines (iOS HIG, Android Material Design)

---

**Document Control:**
- **Author**: Development Team
- **Reviewers**: Product Manager, Stakeholders
- **Next Review Date**: TBD
- **Version History**:
  - v1.0 (Nov 15, 2025): Initial draft based on requirements

