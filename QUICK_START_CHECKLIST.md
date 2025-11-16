# Quick Start Checklist
## FanBattle - NPL Fantasy Predictor Application

This checklist will help you get started with the FanBattle project. Follow these steps in order for a smooth setup.

---

## 📋 Pre-Development Setup

### 1. Team Onboarding
- [ ] All team members have read the [PRD](./PRD.md)
- [ ] All team members understand the [Development Plan](./DEVELOPMENT_PLAN.md)
- [ ] Team roles and responsibilities are assigned
- [ ] Communication channels set up (Slack/Discord, email)
- [ ] Project management tool configured (Jira/Trello/Linear)
- [ ] Sprint schedule agreed upon (2-week sprints)

### 2. Development Tools Installation
- [ ] Install Node.js v18+ ([nodejs.org](https://nodejs.org))
- [ ] Install Git ([git-scm.com](https://git-scm.com))
- [ ] Install Docker Desktop ([docker.com](https://docker.com))
- [ ] Install PostgreSQL client (psql or GUI like pgAdmin)
- [ ] Install Redis client (redis-cli or GUI like RedisInsight)
- [ ] Install VS Code or preferred IDE
- [ ] Install Postman or Insomnia (for API testing)

### 3. Mobile Development Setup

#### iOS Development (Mac only)
- [ ] Install Xcode 14+ from App Store
- [ ] Install Xcode Command Line Tools: `xcode-select --install`
- [ ] Install CocoaPods: `sudo gem install cocoapods`
- [ ] Configure iOS Simulator

#### Android Development (All platforms)
- [ ] Install Android Studio ([developer.android.com](https://developer.android.com/studio))
- [ ] Install Android SDK (API 26+)
- [ ] Configure ANDROID_HOME environment variable
- [ ] Set up Android emulator or connect physical device
- [ ] Enable USB debugging on device (if using physical device)

#### React Native CLI
- [ ] Install React Native CLI: `npm install -g react-native-cli`
- [ ] Install Watchman (Mac): `brew install watchman`

### 4. Additional Tools
- [ ] Install Fastlane: `sudo gem install fastlane`
- [ ] Install AWS CLI (if using AWS): `pip install awscli`
- [ ] Install Docker Compose (included with Docker Desktop)

---

## 🔧 Project Setup

### Step 1: Repository Setup (Week 1, Day 1)

**For Project Lead/DevOps:**
- [ ] Create GitHub/GitLab repository
- [ ] Set up branch protection rules (main, develop)
- [ ] Configure Git Flow branching strategy
- [ ] Create initial project structure (see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md))
- [ ] Add all team members as collaborators
- [ ] Set up repository secrets (for CI/CD)

**For All Developers:**
- [ ] Clone the repository:
  ```bash
  git clone <repository-url>
  cd FanBattle
  ```
- [ ] Configure Git:
  ```bash
  git config user.name "Your Name"
  git config user.email "your.email@example.com"
  ```
- [ ] Create development branch:
  ```bash
  git checkout -b develop
  ```

### Step 2: Backend Setup (Week 1, Days 1-3)

#### Database Setup
- [ ] Start PostgreSQL (via Docker Compose or local):
  ```bash
  docker-compose up -d postgres
  ```
- [ ] Create database:
  ```bash
  psql -U postgres
  CREATE DATABASE fanbattle;
  \q
  ```
- [ ] Run schema file:
  ```bash
  psql -U postgres -d fanbattle -f schema.sql
  ```
- [ ] Verify tables created:
  ```bash
  psql -U postgres -d fanbattle -c "\dt"
  ```

#### Redis Setup
- [ ] Start Redis (via Docker Compose or local):
  ```bash
  docker-compose up -d redis
  ```
- [ ] Test Redis connection:
  ```bash
  redis-cli ping  # Should return "PONG"
  ```

#### Backend Application
- [ ] Initialize NestJS project:
  ```bash
  cd backend
  npm i -g @nestjs/cli
  nest new . --skip-git
  npm install
  ```
- [ ] Install dependencies:
  ```bash
  npm install @nestjs/passport passport passport-jwt
  npm install @nestjs/jwt
  npm install @prisma/client
  npm install prisma -D
  npm install stripe
  npm install @nestjs/config
  npm install class-validator class-transformer
  npm install bcrypt
  npm install @types/bcrypt -D
  ```
- [ ] Initialize Prisma:
  ```bash
  npx prisma init
  ```
- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Configure `.env` file with local database credentials
- [ ] Run Prisma migrations:
  ```bash
  npx prisma migrate dev
  ```
- [ ] Generate Prisma client:
  ```bash
  npx prisma generate
  ```
- [ ] Start development server:
  ```bash
  npm run start:dev
  ```
- [ ] Test API health:
  ```bash
  curl http://localhost:3000/health
  ```

### Step 3: Mobile App Setup (Week 1, Days 2-4)

#### React Native Initialization
- [ ] Initialize React Native project:
  ```bash
  cd mobile
  npx react-native init FanBattle --template react-native-template-typescript
  ```
- [ ] Install core dependencies:
  ```bash
  npm install @react-navigation/native @react-navigation/stack
  npm install react-native-screens react-native-safe-area-context
  npm install @reduxjs/toolkit react-redux
  npm install axios
  npm install react-hook-form
  npm install date-fns
  ```
- [ ] Install native dependencies:
  ```bash
  npm install react-native-gesture-handler react-native-reanimated
  npm install @react-native-firebase/app @react-native-firebase/messaging
  npm install @react-native-google-signin/google-signin
  npm install react-native-fbsdk-next
  npm install @stripe/stripe-react-native
  ```

#### iOS Setup (Mac only)
- [ ] Install pods:
  ```bash
  cd ios
  pod install
  cd ..
  ```
- [ ] Configure Firebase (download `GoogleService-Info.plist`)
- [ ] Configure Facebook SDK in `Info.plist`
- [ ] Configure Google Sign-In in `Info.plist`

#### Android Setup
- [ ] Configure Firebase (download `google-services.json` to `android/app/`)
- [ ] Configure Facebook SDK in `AndroidManifest.xml`
- [ ] Configure Google Sign-In in `strings.xml`

#### Run Mobile App
- [ ] Create `.env` file:
  ```bash
  cp .env.example .env
  ```
- [ ] Configure `.env` with API URL and keys
- [ ] Run on iOS:
  ```bash
  npm run ios
  ```
- [ ] Run on Android:
  ```bash
  npm run android
  ```
- [ ] Verify app launches successfully

### Step 4: Admin Panel Setup (Week 1, Days 3-4)

- [ ] Initialize Vite + React project:
  ```bash
  cd admin
  npm create vite@latest . -- --template react-ts
  npm install
  ```
- [ ] Install Material-UI:
  ```bash
  npm install @mui/material @emotion/react @emotion/styled
  npm install @mui/icons-material
  npm install @mui/x-data-grid
  ```
- [ ] Install other dependencies:
  ```bash
  npm install react-router-dom
  npm install axios
  npm install react-hook-form
  npm install recharts
  ```
- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Configure API URL in `.env`
- [ ] Start development server:
  ```bash
  npm run dev
  ```
- [ ] Open browser to `http://localhost:5173`
- [ ] Verify admin panel loads

### Step 5: Docker Compose Setup (Week 1, Day 5)

- [ ] Create `docker-compose.yml` in root (see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md))
- [ ] Start all services:
  ```bash
  docker-compose up -d
  ```
- [ ] Verify services are running:
  ```bash
  docker-compose ps
  ```
- [ ] Test connectivity:
  - [ ] PostgreSQL: `psql -h localhost -U fanbattle -d fanbattle`
  - [ ] Redis: `redis-cli -h localhost ping`
  - [ ] Backend: `curl http://localhost:3000/health`

---

## 🔑 Third-Party Service Setup

### 1. Firebase Setup (Week 1)
- [ ] Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enable Authentication (Facebook and Google providers)
- [ ] Enable Cloud Messaging
- [ ] Download configuration files:
  - [ ] iOS: `GoogleService-Info.plist`
  - [ ] Android: `google-services.json`
  - [ ] Backend: Service account JSON
- [ ] Add Firebase credentials to `.env` files

### 2. Facebook App Setup (Week 1)
- [ ] Create Facebook App at [developers.facebook.com](https://developers.facebook.com)
- [ ] Add Facebook Login product
- [ ] Configure OAuth redirect URIs
- [ ] Get App ID and App Secret
- [ ] Add to `.env` files

### 3. Google OAuth Setup (Week 1)
- [ ] Create project in [Google Cloud Console](https://console.cloud.google.com)
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials
- [ ] Configure OAuth consent screen
- [ ] Get Client ID and Client Secret
- [ ] Add to `.env` files

### 4. Stripe Setup (Week 2)
- [ ] Create Stripe account at [stripe.com](https://stripe.com)
- [ ] Get test API keys (Publishable and Secret)
- [ ] Set up webhook endpoint (for payment confirmations)
- [ ] Get webhook secret
- [ ] Add to `.env` files
- [ ] Test payment flow in test mode

### 5. AWS Setup (Week 2) - Optional for MVP, can use later
- [ ] Create AWS account
- [ ] Set up IAM user with appropriate permissions
- [ ] Create S3 bucket for file uploads
- [ ] Configure CORS for S3 bucket
- [ ] Get access key and secret key
- [ ] Add to backend `.env`

### 6. Monitoring & Error Tracking (Week 2)
- [ ] Create Sentry account at [sentry.io](https://sentry.io)
- [ ] Create projects for backend, mobile (iOS), mobile (Android)
- [ ] Get DSN keys
- [ ] Add to `.env` files
- [ ] Integrate Sentry SDKs

---

## 🧪 Testing Setup

### Backend Testing
- [ ] Install testing dependencies:
  ```bash
  npm install --save-dev @nestjs/testing jest ts-jest
  npm install --save-dev supertest @types/supertest
  ```
- [ ] Create test database:
  ```bash
  createdb fanbattle_test
  ```
- [ ] Configure `jest.config.js`
- [ ] Write sample test:
  ```bash
  npm test
  ```

### Mobile App Testing
- [ ] Install testing dependencies:
  ```bash
  npm install --save-dev jest @testing-library/react-native
  npm install --save-dev detox
  ```
- [ ] Initialize Detox:
  ```bash
  detox init
  ```
- [ ] Configure Detox for iOS and Android
- [ ] Run sample test:
  ```bash
  npm test
  ```

### Load Testing
- [ ] Install Artillery:
  ```bash
  npm install -g artillery
  ```
- [ ] Create load test scenarios
- [ ] Run initial baseline test

---

## 🚀 CI/CD Setup

### GitHub Actions (Week 2)
- [ ] Create `.github/workflows/` directory
- [ ] Create workflow files:
  - [ ] `backend-ci.yml` - Backend testing and deployment
  - [ ] `mobile-ci.yml` - Mobile app builds
  - [ ] `admin-ci.yml` - Admin panel deployment
- [ ] Configure repository secrets:
  - [ ] `DATABASE_URL` (for tests)
  - [ ] `JWT_SECRET`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] Firebase credentials
  - [ ] AWS credentials (if used)
- [ ] Test CI pipeline by pushing to develop branch
- [ ] Verify all tests pass

### Fastlane Setup (Week 2)
- [ ] Initialize Fastlane for iOS:
  ```bash
  cd mobile/ios
  fastlane init
  ```
- [ ] Initialize Fastlane for Android:
  ```bash
  cd mobile/android
  fastlane init
  ```
- [ ] Configure lanes for beta and production builds
- [ ] Set up App Store Connect API key
- [ ] Set up Google Play Console service account

---

## 📊 Monitoring & Analytics

### Application Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Configure Firebase Analytics
- [ ] Set up backend logging (Winston)
- [ ] Create monitoring dashboards

### Infrastructure Monitoring (Production)
- [ ] Set up AWS CloudWatch (if using AWS)
- [ ] Configure database monitoring
- [ ] Set up Redis monitoring
- [ ] Create alerting rules

---

## 📝 Development Best Practices

### Code Quality
- [ ] Set up ESLint configuration
- [ ] Set up Prettier configuration
- [ ] Install Husky for pre-commit hooks:
  ```bash
  npm install --save-dev husky lint-staged
  npx husky install
  ```
- [ ] Configure pre-commit hooks:
  ```bash
  npx husky add .husky/pre-commit "npm test"
  ```

### Code Reviews
- [ ] Establish code review process
- [ ] Create pull request template
- [ ] Set minimum reviewers requirement (2)
- [ ] Define review checklist

### Documentation
- [ ] Set up API documentation (Swagger)
- [ ] Create component documentation (Storybook - optional)
- [ ] Maintain updated README files
- [ ] Document major decisions in ADR format

---

## 🎯 Phase 1 Kickoff Checklist (Week 1 Complete)

Before starting development, ensure:
- [ ] All developers can run backend locally
- [ ] All developers can run mobile app on iOS/Android
- [ ] All developers can access admin panel
- [ ] Database schema is deployed and tested
- [ ] All third-party services are configured
- [ ] CI/CD pipelines are working
- [ ] Team communication channels are active
- [ ] Sprint 1 backlog is ready
- [ ] All blockers are resolved

---

## 🔄 Daily Developer Workflow

### Starting the Day
1. Pull latest changes:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. Start Docker services:
   ```bash
   docker-compose up -d
   ```
3. Start backend:
   ```bash
   cd backend && npm run start:dev
   ```
4. Start mobile app (iOS or Android):
   ```bash
   cd mobile && npm run ios
   ```

### Making Changes
1. Create feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make code changes
3. Write tests
4. Run tests:
   ```bash
   npm test
   ```
5. Commit changes:
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

### Submitting Work
1. Push branch:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Create pull request on GitHub/GitLab
3. Request code reviews
4. Address review feedback
5. Merge after approval

---

## 🆘 Troubleshooting Common Issues

### Issue: Database connection failed
**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check database URL in .env
echo $DATABASE_URL
```

### Issue: iOS build fails
**Solution:**
```bash
# Clean build folder
cd ios
rm -rf build/
rm -rf Pods/
rm Podfile.lock

# Reinstall pods
pod install --repo-update
cd ..

# Try again
npm run ios
```

### Issue: Android build fails
**Solution:**
```bash
# Clean gradle cache
cd android
./gradlew clean

# Try again
cd ..
npm run android
```

### Issue: Metro bundler not starting
**Solution:**
```bash
# Clear watchman watches
watchman watch-del-all

# Delete node_modules
rm -rf node_modules

# Clear cache
npm start -- --reset-cache
```

### Issue: Prisma client out of sync
**Solution:**
```bash
cd backend
npx prisma generate
npm run start:dev
```

---

## 📞 Team Contacts

**Project Manager:**
- Name: [TBD]
- Email: [TBD]
- Slack: @[username]

**Tech Lead:**
- Name: [TBD]
- Email: [TBD]
- Slack: @[username]

**DevOps Engineer:**
- Name: [TBD]
- Email: [TBD]
- Slack: @[username]

**Emergency Contacts:**
- On-call rotation: [Link to schedule]
- Incident response: [Process doc link]

---

## 📚 Additional Resources

- [PRD](./PRD.md) - Product Requirements
- [Development Plan](./DEVELOPMENT_PLAN.md) - Technical roadmap
- [Project Structure](./PROJECT_STRUCTURE.md) - Code organization
- [Database Schema](./schema.sql) - Database design
- [React Native Docs](https://reactnative.dev/)
- [NestJS Docs](https://nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Material-UI Docs](https://mui.com/)

---

## ✅ Ready to Start!

Once all items in this checklist are complete, you're ready to begin Phase 1 development!

**Next Steps:**
1. Attend Sprint 1 Planning meeting
2. Pick up first task from backlog
3. Start coding! 🚀

---

**Questions?** Contact your team lead or post in the team Slack channel.

**Last Updated:** November 15, 2025  
**Version:** 1.0

