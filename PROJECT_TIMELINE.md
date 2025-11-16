# Project Timeline
## FanBattle - NPL Fantasy Predictor Application

**Total Duration:** 20 weeks (5 months)  
**Start Date:** [To be determined]  
**Target Launch:** [Start Date + 20 weeks]

---

## 📅 High-Level Timeline

```
PHASE 1-2: Foundation & Auth        ████ (Weeks 1-4)
PHASE 3-4: Tournament & Matches     ████ (Weeks 5-8)
PHASE 5-6: Entry & Predictions      ████ (Weeks 9-12)
PHASE 7-8: Scoring & Leaderboard    ████ (Weeks 13-15)
PHASE 9: Notifications              ██ (Week 16)
PHASE 10: Testing & Launch          ████ (Weeks 17-20)
                                    ────────────────────
                                    1         10        20
```

---

## 📊 Detailed Timeline

### PHASE 1: Foundation & Setup
**Duration:** Weeks 1-2 (Sprint 1)  
**Status:** 🔵 Not Started

```
Week 1
├─ Day 1-2: Repository & Environment Setup
│  ├─ Create GitHub repository
│  ├─ Set up Git Flow branching
│  ├─ Configure CI/CD pipelines
│  └─ Team onboarding
│
├─ Day 3-4: Database & Infrastructure
│  ├─ PostgreSQL setup (local + cloud)
│  ├─ Redis setup
│  ├─ Database schema migration
│  └─ Docker Compose configuration
│
└─ Day 5: Backend Initialization
   ├─ NestJS project setup
   ├─ Prisma ORM configuration
   └─ Basic API structure

Week 2
├─ Day 1-2: Mobile App Boilerplate
│  ├─ React Native initialization
│  ├─ Navigation setup
│  ├─ Redux store configuration
│  └─ iOS/Android configuration
│
├─ Day 3-4: Admin Panel Boilerplate
│  ├─ React + Vite setup
│  ├─ Material-UI integration
│  └─ Routing configuration
│
└─ Day 5: Validation & Sprint Review
   ├─ Environment validation
   ├─ Team demo
   └─ Sprint retrospective

Deliverables:
✅ All developers can run project locally
✅ Database schema deployed
✅ CI/CD pipeline running
✅ Boilerplate apps functional
```

---

### PHASE 2: Authentication & User Management
**Duration:** Weeks 3-4 (Sprint 2)  
**Status:** 🔵 Not Started

```
Week 3
├─ Backend: Authentication API
│  ├─ JWT authentication middleware
│  ├─ User registration endpoint
│  ├─ Login endpoint
│  └─ Profile endpoints
│
├─ Backend: OAuth Integration
│  ├─ Facebook OAuth strategy
│  ├─ Google OAuth strategy
│  └─ Token management
│
└─ Testing: Auth unit tests

Week 4
├─ Mobile: Login Flow
│  ├─ Login screen UI
│  ├─ Facebook Login SDK
│  ├─ Google Sign-In SDK
│  └─ Token storage
│
├─ Admin: Admin Login
│  └─ Admin authentication panel
│
└─ Testing: Auth integration tests

Milestone: M2 - Authentication Live ✓
Users can register and log in with Facebook/Google
```

---

### PHASE 3: Tournament & Team Management
**Duration:** Weeks 5-6 (Sprint 3)  
**Status:** 🔵 Not Started

```
Week 5
├─ Backend: Tournament API
│  ├─ Tournament CRUD endpoints
│  ├─ Team CRUD endpoints
│  ├─ Player CRUD endpoints
│  └─ File upload (S3)
│
└─ Admin Panel: Management UI
   ├─ Tournament management
   ├─ Team management
   └─ Player management

Week 6
├─ Mobile: Tournament Viewing
│  ├─ Home screen with tournaments
│  ├─ Tournament detail screen
│  ├─ Teams listing
│  ├─ Team detail screen
│  └─ Player detail screen
│
└─ Data Caching
   └─ Local storage for offline viewing

Milestone: M3 - Admin Panel Functional ✓
Admin can create and manage tournament data
```

---

### PHASE 4: Match Scheduling & Fixtures
**Duration:** Weeks 7-8 (Sprint 4)  
**Status:** 🔵 Not Started

```
Week 7
├─ Backend: Match API
│  ├─ Match CRUD endpoints
│  ├─ Match validation
│  ├─ Fixture endpoints with filters
│  └─ Prediction deadline calculation
│
└─ Admin Panel: Match Management
   ├─ Match scheduling UI
   ├─ Fixture dashboard
   └─ Bulk schedule import

Week 8
├─ Mobile: Fixtures Display
│  ├─ Fixtures screen (ESPN style)
│  ├─ Match detail screen
│  ├─ Fixture filters
│  ├─ Tie sheet/bracket view
│  └─ Countdown timers
│
└─ Testing: Match flow tests

Milestone: M4 - Fixtures Visible ✓
Users can view 32-match schedule
```

---

### PHASE 5: User Entry & Season Team Selection
**Duration:** Weeks 9-10 (Sprint 5)  
**Status:** 🔵 Not Started

```
Week 9
├─ Backend: Entry & Payment
│  ├─ User entry endpoint
│  ├─ Stripe payment integration
│  ├─ Webhook handler
│  ├─ Season team validation
│  └─ Tournament-end predictions
│
└─ Testing: Payment flow tests

Week 10
├─ Mobile: Registration Flow
│  ├─ Tournament registration screen
│  ├─ Season team selection
│  ├─ Tournament-end predictions
│  ├─ Stripe payment SDK
│  ├─ Payment confirmation
│  └─ Error handling
│
└─ Admin Panel: Entries Dashboard
   ├─ User entries view
   ├─ Payment status tracking
   └─ Financial reports

Milestone: M5 - Payment Integration ✓
Users can pay and register for tournaments
```

---

### PHASE 6: Prediction Submission System
**Duration:** Weeks 11-12 (Sprint 6)  
**Status:** 🔵 Not Started

```
Week 11
├─ Backend: Prediction API
│  ├─ Prediction submission endpoint
│  ├─ Deadline validation
│  ├─ Prediction update endpoint
│  ├─ Prediction retrieval
│  └─ Validation logic
│
└─ Testing: Prediction tests

Week 12
├─ Mobile: Prediction UI
│  ├─ Match prediction screen
│  │  ├─ Winner selection
│  │  ├─ Man of the Match
│  │  ├─ Score category
│  │  └─ Wickets prediction
│  ├─ Prediction confirmation
│  ├─ Prediction edit screen
│  ├─ Prediction history
│  └─ Deadline indicator
│
└─ Admin Panel: Predictions View
   └─ Predictions dashboard

Milestone: M6 - Predictions Enabled ✓
Users can submit and edit predictions
```

---

### PHASE 7: Scoring Engine (CRITICAL)
**Duration:** Weeks 13-14 (Sprint 7)  
**Status:** 🔵 Not Started  
**Priority:** 🔴 HIGHEST

```
Week 13
├─ Backend: Scoring Engine Core
│  ├─ Base points calculation
│  │  ├─ League: 3 points
│  │  ├─ Playoffs: 5 points
│  │  └─ Final: 7 points
│  ├─ Penalty fees
│  │  ├─ League: $2
│  │  ├─ Playoffs: $3
│  │  └─ Final: $5
│  └─ Season team adjustments
│     ├─ +1 for season team win
│     └─ -1 for season team loss
│
└─ Testing: Base scoring tests

Week 14
├─ Backend: Advanced Scoring
│  ├─ Bonus calculations
│  │  ├─ Man of the Match (+1)
│  │  ├─ Score category (+1)
│  │  └─ Wickets (+1)
│  ├─ Match validity rules
│  │  ├─ Reduced overs handling
│  │  ├─ Super over handling
│  │  └─ DLS method handling
│  ├─ Tournament-end bonuses
│  │  ├─ Season team wins title (+5)
│  │  ├─ Highest Run Getter (+5)
│  │  ├─ Highest Wicket Taker (+5)
│  │  └─ Player of Tournament (+5)
│  └─ Scoring trigger endpoint
│
├─ Admin Panel: Result Entry
│  ├─ Match result form
│  ├─ Calculate scores button
│  └─ Scoring log viewer
│
└─ Testing: Comprehensive scoring tests
   ├─ All scoring scenarios
   ├─ Edge cases
   └─ Performance tests

Milestone: M7 - Scoring Engine Live ✓
Points calculated correctly for all scenarios
95%+ test coverage on scoring logic
```

---

### PHASE 8: Leaderboard & User Dashboard
**Duration:** Week 15 (Sprint 8)  
**Status:** 🔵 Not Started

```
Week 15
├─ Backend: Leaderboard API
│  ├─ Leaderboard endpoint
│  ├─ Ranking calculation
│  ├─ Redis caching
│  ├─ User stats endpoint
│  └─ Battle stats endpoint
│
├─ Mobile: Dashboard & Leaderboard
│  ├─ Leaderboard screen
│  ├─ User dashboard
│  │  ├─ Tournament overview
│  │  ├─ Total points & rank
│  │  ├─ Season team performance
│  │  └─ Upcoming matches
│  ├─ Battle stats screen
│  └─ Financial summary screen
│
└─ Admin Panel: Leaderboard View
   └─ Tournament leaderboard

Milestone: M8 - Leaderboard & Dashboard Complete ✓
Real-time leaderboard with user stats
```

---

### PHASE 9: Notifications & Tournament-End
**Duration:** Week 16 (Sprint 9)  
**Status:** 🔵 Not Started

```
Week 16
├─ Backend: Notification Service
│  ├─ Firebase Cloud Messaging
│  ├─ Notification types
│  │  ├─ Prediction reminders
│  │  ├─ Match results
│  │  ├─ Leaderboard updates
│  │  └─ Announcements
│  ├─ Notification scheduling
│  └─ Tournament completion logic
│
├─ Mobile: Notifications
│  ├─ FCM integration
│  ├─ Permission requests
│  ├─ Notification handling
│  └─ Deep linking
│
├─ Backend: Tournament-End Bonuses
│  ├─ Final bonus calculation
│  └─ Prize distribution
│
└─ Admin Panel: Tournament Completion
   ├─ Tournament-end results entry
   └─ Final standings view

Milestone: M9 - Beta Release ✓
All features complete and functional
```

---

### PHASE 10: Testing, Polish & Launch
**Duration:** Weeks 17-20 (Sprints 10-11)  
**Status:** 🔵 Not Started

```
Week 17: Comprehensive Testing
├─ Backend Testing
│  ├─ Unit test coverage (80%+)
│  ├─ Integration tests
│  ├─ Load testing (10K users)
│  └─ Security audit
│
├─ Mobile Testing
│  ├─ E2E tests (Detox)
│  ├─ Device testing
│  ├─ Performance optimization
│  └─ Accessibility testing
│
└─ Admin Panel Testing
   ├─ Browser compatibility
   └─ User acceptance testing

Week 18: Bug Fixes & Polish
├─ Fix critical bugs
├─ Performance optimization
├─ UI/UX refinements
├─ Beta testing with users
└─ Feedback incorporation

Week 19: App Store Preparation
├─ iOS Submission
│  ├─ App Store assets
│  ├─ Screenshots & descriptions
│  ├─ Privacy policy
│  └─ Submit for review
│
├─ Android Submission
│  ├─ Play Store assets
│  ├─ Screenshots & descriptions
│  └─ Submit for review
│
└─ Production Deployment
   ├─ Backend to AWS
   ├─ Admin panel to hosting
   └─ Final smoke tests

Week 20: Production Launch 🚀
├─ Day 1-2: App Store approval monitoring
├─ Day 3: Production deployment
├─ Day 4: Public launch
│  ├─ Apps live on stores
│  ├─ Marketing announcement
│  └─ Press release
├─ Day 5: Post-launch monitoring
│  ├─ Error tracking
│  ├─ User feedback
│  └─ Performance metrics
│
└─ Post-Launch Activities
   ├─ User support
   ├─ Bug fixes
   └─ Retrospective

Milestone: M10 - Production Launch ✓
Apps live on App Store and Play Store
```

---

## 🎯 Key Milestones

| # | Milestone | Week | Status | Success Criteria |
|---|-----------|------|--------|------------------|
| M1 | Foundation Complete | 2 | 🔵 Pending | All developers can run project locally |
| M2 | Authentication Live | 4 | 🔵 Pending | Users can log in with Facebook/Google |
| M3 | Admin Panel Functional | 6 | 🔵 Pending | Admin can create tournament data |
| M4 | Fixtures Visible | 8 | 🔵 Pending | Users can view 32-match schedule |
| M5 | Payment Integration | 10 | 🔵 Pending | Users can pay $50 entry fee |
| M6 | Predictions Enabled | 12 | 🔵 Pending | Users can submit predictions |
| M7 | Scoring Engine Live | 14 | 🔵 Pending | Points calculated correctly |
| M8 | Dashboard Complete | 15 | 🔵 Pending | Leaderboard and stats visible |
| M9 | Beta Release | 16 | 🔵 Pending | All features complete |
| M10 | Production Launch | 20 | 🔵 Pending | Apps live on stores |

**Legend:**  
🔵 Not Started | 🟡 In Progress | 🟢 Complete | 🔴 Blocked

---

## 📈 Progress Tracking

### Overall Progress
```
Foundation & Setup:         [          ] 0%
Authentication:             [          ] 0%
Tournament Management:      [          ] 0%
Match Scheduling:           [          ] 0%
Entry & Payment:            [          ] 0%
Prediction System:          [          ] 0%
Scoring Engine:             [          ] 0%
Leaderboard:                [          ] 0%
Notifications:              [          ] 0%
Testing & Launch:           [          ] 0%
                            ─────────────
Overall Project:            [          ] 0%
```

*This section should be updated weekly by the project manager.*

---

## 🚨 Critical Path

The following items are on the **critical path** and cannot be delayed:

1. **Database Schema** (Week 1) - Blocks all data operations
2. **Authentication** (Weeks 3-4) - Blocks all user-specific features
3. **Payment Integration** (Weeks 9-10) - Blocks user registration
4. **Scoring Engine** (Weeks 13-14) - Core business logic, complex
5. **App Store Submissions** (Week 19) - Apple review takes 2-5 days

**Risk Buffer:** 20% time buffer included in estimates for each phase.

---

## 📅 Sprint Schedule

### Sprint Cadence: 2 weeks per sprint

| Sprint | Weeks | Focus | Demo Date |
|--------|-------|-------|-----------|
| **Sprint 1** | 1-2 | Foundation & Setup | Week 2, Fri |
| **Sprint 2** | 3-4 | Authentication | Week 4, Fri |
| **Sprint 3** | 5-6 | Tournament Management | Week 6, Fri |
| **Sprint 4** | 7-8 | Match Scheduling | Week 8, Fri |
| **Sprint 5** | 9-10 | Entry & Payment | Week 10, Fri |
| **Sprint 6** | 11-12 | Prediction System | Week 12, Fri |
| **Sprint 7** | 13-14 | Scoring Engine | Week 14, Fri |
| **Sprint 8** | 15 | Leaderboard & Dashboard | Week 15, Fri |
| **Sprint 9** | 16 | Notifications | Week 16, Fri |
| **Sprint 10** | 17-18 | Testing & Bug Fixes | Week 18, Fri |
| **Sprint 11** | 19-20 | Launch Preparation | Week 20, Fri |

**Sprint Ceremonies:**
- **Sprint Planning**: First Monday of sprint (2 hours)
- **Daily Standups**: Every day, 15 minutes
- **Sprint Review**: Last Friday of sprint (1 hour)
- **Sprint Retrospective**: Last Friday of sprint (30 minutes)

---

## 🔄 Dependencies

### External Dependencies
- **Third-Party Services**: Must be set up by Week 2
  - Firebase (auth, notifications)
  - Stripe (payments)
  - AWS (hosting, storage)
  - Sentry (error tracking)

### Internal Dependencies
```
Authentication → All user-specific features
Database Schema → All features
Payment Integration → Prediction submission
Match Results → Scoring Engine
Scoring Engine → Leaderboard
```

---

## ⚠️ Risk Timeline

| Risk | Impact Window | Mitigation Due |
|------|---------------|----------------|
| Team ramp-up delays | Weeks 1-2 | Complete onboarding by Week 1 |
| Database design changes | Weeks 1-3 | Finalize schema by Week 1 |
| Third-party API issues | Weeks 2-10 | Test integrations early |
| Scoring logic complexity | Weeks 13-14 | Allocate extra testing time |
| App Store rejection | Week 19 | Submit early, follow guidelines |
| Payment compliance | Weeks 9-10 | Consult Stripe documentation |

---

## 📊 Resource Allocation

### Team Distribution by Phase

```
Week 1-2   (Foundation)
Backend:     ████████ (80%)
Mobile:      ████ (40%)
Frontend:    ████ (40%)
DevOps:      ████████ (80%)
QA:          ██ (20%)

Week 3-8   (Features)
Backend:     ████████ (80%)
Mobile:      ████████ (80%)
Frontend:    ████████ (80%)
DevOps:      ████ (40%)
QA:          ████ (40%)

Week 9-16  (Core Logic)
Backend:     ██████████ (100%)
Mobile:      ██████████ (100%)
Frontend:    ████████ (80%)
DevOps:      ████ (40%)
QA:          ████████ (80%)

Week 17-20 (Testing)
Backend:     ████ (40%)
Mobile:      ████ (40%)
Frontend:    ████ (40%)
DevOps:      ████████ (80%)
QA:          ██████████ (100%)
```

---

## 🎉 Launch Checklist

### Pre-Launch (Week 19)
- [ ] All critical bugs fixed (P0/P1)
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Legal documents finalized (ToS, Privacy Policy)
- [ ] App Store metadata complete
- [ ] Play Store metadata complete
- [ ] Marketing materials ready
- [ ] Support infrastructure ready
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested

### Launch Day (Week 20, Day 4)
- [ ] Apps approved on both stores
- [ ] Production deployment complete
- [ ] DNS configured
- [ ] SSL certificates valid
- [ ] Payment gateway in live mode
- [ ] Push notifications working
- [ ] Social media announcement
- [ ] Press release distributed
- [ ] Team on standby for issues

### Post-Launch (Week 20, Day 5+)
- [ ] Monitor error rates
- [ ] Track user registrations
- [ ] Respond to app reviews
- [ ] Track performance metrics
- [ ] Plan first post-launch update

---

## 📞 Escalation Path

**For Timeline Delays:**
1. Alert Scrum Master immediately
2. Adjust sprint scope if needed
3. Escalate to Project Manager if > 2 days delay
4. Consider adding resources

**For Blocker Issues:**
1. Flag in daily standup
2. Tech Lead to investigate within 4 hours
3. If unresolved in 24 hours, escalate to management

---

## 📝 Notes

- All dates are estimates and subject to change
- Buffer time included in each phase (15-20%)
- Assumes full-time availability of all team members
- Holidays and weekends not included in working days
- Timeline can be compressed with additional resources
- Timeline may expand if features are added (scope creep)

---

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Status:** Draft - Awaiting Approval

**Prepared By:** Development Team  
**Approved By:** [Pending]

---

*This timeline should be reviewed and updated weekly during sprint retrospectives.*

