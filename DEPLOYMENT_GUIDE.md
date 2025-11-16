# FanBattle - Deployment Guide

## 🚀 Quick Deployment Checklist

### Pre-Deployment (Complete These First)

- [ ] **Step 1: Firebase Setup**
  1. Go to [Firebase Console](https://console.firebase.google.com/)
  2. Create a new project (or use existing)
  3. Enable Firestore Database (Start in production mode)
  4. Enable Authentication > Sign-in method > Google (Enable it)
  5. Get your Firebase config from Project Settings

- [ ] **Step 2: Environment Variables**
  1. Create `.env.local` file in project root
  2. Add Firebase configuration:
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
  NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
  NEXT_PUBLIC_ADMIN_EMAILS=your-email@gmail.com
  ```

- [ ] **Step 3: Install Dependencies**
  ```bash
  npm install
  ```

- [ ] **Step 4: Seed Database**
  ```bash
  npm run seed
  ```
  This will create:
  - 1 tournament (NPL 2025 Season 2)
  - 8 teams
  - 160 players (20 per team)
  - 31 matches (with real 2025 schedule)

- [ ] **Step 5: Test Locally**
  ```bash
  npm run dev
  ```
  Open http://localhost:3000

---

## 🧪 Local Testing Checklist

### Authentication Testing
- [ ] Can sign in with Google
- [ ] Can sign out
- [ ] User state persists across page refreshes
- [ ] Redirects work correctly (login → home, etc.)

### Registration Testing
- [ ] Can select season team
- [ ] Registration creates user entry in Firestore
- [ ] Can't register twice
- [ ] Redirects to dashboard after registration

### Prediction Testing
- [ ] Can view match details
- [ ] Can select winner (required)
- [ ] Can select optional fields (MoM, score, wickets)
- [ ] Can submit prediction
- [ ] Can edit prediction before deadline
- [ ] Can't submit after deadline
- [ ] Prediction saves to Firestore

### Admin Testing (use your admin email)
- [ ] Can access /admin page
- [ ] Non-admin can't access /admin
- [ ] Can select a match
- [ ] Can enter winner
- [ ] Can enter optional fields
- [ ] Can submit result
- [ ] Scoring calculates correctly
- [ ] Points update in user entries
- [ ] Leaderboard updates

### Leaderboard Testing
- [ ] Shows all registered users
- [ ] Sorted by points (highest first)
- [ ] Shows user's rank
- [ ] Highlights current user
- [ ] Updates after scoring

### Dashboard Testing
- [ ] Shows user's total points
- [ ] Shows user's rank
- [ ] Shows season team
- [ ] Shows upcoming matches
- [ ] Shows prediction history
- [ ] Shows points breakdown

---

## 📱 Mobile Testing

### Responsive Design
- [ ] Test on mobile browser (Chrome mobile, Safari iOS)
- [ ] Test on tablet
- [ ] Check all pages are mobile-friendly
- [ ] Navigation works on mobile
- [ ] Forms are easy to use on mobile

### PWA Testing
- [ ] Can "Add to Home Screen"
- [ ] App icon appears correctly
- [ ] Opens in standalone mode
- [ ] Works offline (cached data)

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your repository
   - Add environment variables:
     - Copy all from `.env.local`
     - Paste into Vercel environment variables
   - Click "Deploy"

3. **Post-Deployment**
   - Vercel will give you a URL (e.g., `fanbattle.vercel.app`)
   - Test the deployed app thoroughly
   - Update Firebase Auth authorized domains (if needed)

### Option 2: Other Platforms

**Netlify:**
- Similar to Vercel
- Connect GitHub repo
- Add environment variables
- Deploy

**Your Own Server:**
```bash
npm run build
npm start
```

---

## 🔐 Firebase Security Rules

Update Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        request.auth.token.email in [
          'your-email@gmail.com',  // Replace with actual admin emails
        ];
    }
    
    // Tournaments: Read by all, write by admin
    match /tournaments/{tournament} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Teams: Read by all, write by admin
    match /teams/{team} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Players: Read by all, write by admin
    match /players/{player} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Matches: Read by all, write by admin
    match /matches/{match} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // User Entries: Users can create their own, admins can update
    match /userEntries/{userId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if isAdmin() || request.auth.uid == userId;
    }
    
    // Predictions: Users can manage their own
    match /predictions/{prediction} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        resource.data.userId == request.auth.uid ||
        isAdmin();
    }
  }
}
```

---

## 📊 Post-Launch Monitoring

### Day 1 (Nov 17, 4:00 PM NST - First Match)

**Before First Match:**
- [ ] Verify all users have registered
- [ ] Verify all users have selected season team
- [ ] Test prediction submission one more time
- [ ] Post link in group chat
- [ ] Be available for support

**After First Match (~6:00 PM NST):**
- [ ] Check official NPL sources for result
- [ ] Go to /admin
- [ ] Enter: Winner, MoM, first innings score, wickets
- [ ] Click "Submit Result & Calculate Scores"
- [ ] Verify leaderboard updates correctly
- [ ] Post leaderboard screenshot in group

### Throughout Tournament
- [ ] Update results within 1 hour of match completion
- [ ] Monitor Firebase usage (Console > Usage tab)
- [ ] Check Vercel logs for errors
- [ ] Respond to user questions
- [ ] Fix critical bugs immediately

---

## 🐛 Troubleshooting

### Issue: Authentication not working
**Solution:**
- Check Firebase Auth is enabled
- Check authorized domains in Firebase Console
- Verify environment variables are set correctly

### Issue: Seed script fails
**Solution:**
```bash
# Make sure you're using the correct Firebase credentials
# Check if database URL is correct in .env.local
# Try running with explicit config:
tsx scripts/seed.ts
```

### Issue: Scoring not calculating
**Solution:**
- Check admin email is in NEXT_PUBLIC_ADMIN_EMAILS
- Verify match has winner selected
- Check console logs for errors
- Test scoring engine locally with test scenarios

### Issue: Leaderboard not updating
**Solution:**
- Rankings are calculated after each match result
- Refresh the page
- Check if user entries have totalPoints updated in Firestore

### Issue: PWA not working
**Solution:**
- PWA requires HTTPS (works on Vercel automatically)
- Check manifest.json is accessible
- Clear browser cache and try again

---

## 💾 Backup Strategy

### Daily Backups (Recommended)
- Firebase has automatic backups
- Manually export Firestore data:
  - Firebase Console > Firestore > Import/Export
  - Export to Cloud Storage bucket

### Before Major Updates
- Export Firestore data
- Keep a copy of environment variables
- Tag git commit before deploying

---

## 🎯 Performance Optimization

### After Launch

1. **Enable Firebase Indexes**
   - Firebase will suggest indexes in Console
   - Create them for faster queries

2. **Monitor Performance**
   - Check Vercel analytics
   - Monitor Firebase usage
   - Optimize slow queries

3. **Caching**
   - Leaderboard refreshes every 30 seconds
   - Consider Redis for high traffic (future)

---

## 📈 Success Metrics to Track

- Total users registered
- Total predictions submitted
- Prediction accuracy (avg %)
- Daily active users
- App performance (load time)
- User feedback

---

## 🔄 Post-Tournament

1. **Export Final Data**
   - Export leaderboard
   - Export all predictions
   - Export match results

2. **Announce Winners**
   - Post final leaderboard
   - Congratulate winners

3. **Collect Feedback**
   - What worked well?
   - What needs improvement?
   - Feature requests for next season

4. **Plan Next Season**
   - Review PRD
   - Prioritize improvements
   - Add tournament-end predictions (HRG, HWT, POT)
   - Add push notifications
   - Improve admin panel

---

## 🚀 You're Ready!

Your FanBattle app is complete and ready for deployment. Follow this guide step by step, and you'll have a live app before the first match on **November 17, 4:00 PM NST**.

**Good luck with the tournament! 🏏🎉**

---

## 📞 Quick Links

- [Firebase Console](https://console.firebase.google.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)

---

**Need Help?**
- Check browser console for errors
- Check Vercel deployment logs
- Check Firebase Firestore rules
- Verify environment variables are set

**Last Updated:** November 15, 2025

