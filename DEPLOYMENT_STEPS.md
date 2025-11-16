# 🚀 Vercel Deployment Steps

## Quick Reference Guide for Deploying FanBattle

---

## 📋 Initial Deployment

### 1. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository: `amannepid/FanBattle`
4. Select the repository and click **"Import"**

### 2. Configure Project Settings

**Framework Preset:** Next.js (auto-detected)

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install` (auto-detected)

### 3. Add Environment Variables

Click **"Environment Variables"** and add all 8 variables:

| Variable Name | Value Source | Required |
|--------------|--------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | From `.env.local` | ✅ Yes |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Your admin email | ✅ Yes |

**Important:** Select all three environments:
- ✅ Production
- ✅ Preview
- ✅ Development

### 4. Deploy

Click **"Deploy"** button and wait 2-4 minutes.

---

## 🔄 Redeploying After Code Changes

### Method 1: Automatic (Recommended)

Once connected to GitHub, Vercel auto-deploys when you push:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically build and deploy the latest commit.

### Method 2: Manual Trigger

If you need to redeploy the same code:

1. Go to Vercel Dashboard → Your Project
2. Click **"Deployments"** tab
3. Click the **"..."** menu on the latest deployment
4. Select **"Redeploy"**
5. Click **"Redeploy"** again to confirm

### Method 3: From Specific Commit

1. Go to **"Deployments"** tab
2. Find the commit you want to deploy
3. Click **"..."** menu
4. Select **"Promote to Production"**

---

## 🔧 Firebase Configuration (Critical!)

After your first deployment, you MUST authorize your Vercel domain in Firebase:

### Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **npl-fan-battle**
3. Navigate to **Authentication** → **Settings**
4. Scroll to **"Authorized domains"**
5. Click **"Add domain"**
6. Enter your Vercel URL without `https://`:
   - Example: `fan-battle.vercel.app`
   - Or your custom domain
7. Click **"Add"**

**Without this step, users will get "auth/unauthorized-domain" error when trying to log in!**

---

## 📊 Monitoring Your Deployment

### Build Logs

Watch your deployment progress:

1. Go to **Deployments** tab
2. Click on the running deployment
3. View real-time build logs

### Common Build Stages:

```
⏳ Queued
📦 Initializing
🔨 Building
   ├─ Installing dependencies
   ├─ Running build command
   ├─ Linting and type checking
   └─ Optimizing production build
📤 Uploading
✅ Ready
```

### Expected Build Time:
- First deployment: 3-5 minutes
- Subsequent deployments: 2-3 minutes

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Visit your live URL
- [ ] Verify homepage loads with matches
- [ ] Test Google Sign-In
- [ ] Complete registration flow
- [ ] Make a test prediction
- [ ] Check dashboard
- [ ] View leaderboard
- [ ] Test on mobile device
- [ ] Add to home screen (PWA)

---

## 🐛 Troubleshooting Common Issues

### Issue: Build Fails with TypeScript Errors

**Solution:**
1. Fix errors locally first
2. Run `npm run build` locally to verify
3. Commit and push the fix
4. Vercel will auto-deploy the new commit

### Issue: "auth/unauthorized-domain" Error

**Solution:**
- Add your Vercel domain to Firebase authorized domains (see above)

### Issue: Environment Variables Not Working

**Solution:**
1. Go to Settings → Environment Variables
2. Verify all 8 variables are set
3. Check variable names are exactly correct (case-sensitive)
4. Redeploy after adding/changing variables

### Issue: Images Not Loading

**Solution:**
- Verify images exist in `/public/teams/` folder
- Check image paths are correct
- Clear Vercel cache and redeploy

### Issue: "No matches found" on Live Site

**Solution:**
- Verify Firebase database is seeded
- Run `npm run seed` locally to populate data
- Check Firestore security rules allow read access

### Issue: Building Old Code

**Solution:**
- Check which commit Vercel is building
- Trigger new deployment from latest commit
- Verify GitHub repository has latest code

---

## 🌐 Custom Domain Setup (Optional)

### Add Your Own Domain:

1. Go to **Settings** → **Domains**
2. Enter your domain name (e.g., `npl-fanbattle.com`)
3. Follow DNS configuration instructions:
   - Add A record pointing to Vercel's IP
   - Or add CNAME record
4. Wait for DNS propagation (5-60 minutes)
5. **Important:** Add custom domain to Firebase authorized domains too!

---

## 📱 PWA Installation

Your app is installable as a Progressive Web App!

### On Mobile (iOS/Android):
1. Visit your site in Safari/Chrome
2. Tap the Share button
3. Select "Add to Home Screen"
4. App icon appears on home screen

### On Desktop (Chrome):
1. Visit your site
2. Look for install icon in address bar
3. Click to install
4. Opens as standalone app

---

## 🔄 Continuous Deployment Workflow

Your typical workflow after initial setup:

```bash
# 1. Make changes locally
# Edit files in your code editor

# 2. Test locally
npm run dev

# 3. Build locally to catch errors
npm run build

# 4. Commit and push
git add .
git commit -m "Description of changes"
git push origin main

# 5. Vercel automatically deploys
# Wait 2-3 minutes, then check live site
```

---

## 📊 Performance Monitoring

Vercel provides analytics:

1. Go to **Analytics** tab
2. View:
   - Page views
   - Unique visitors
   - Top pages
   - Performance metrics
   - Real User Monitoring (RUM)

---

## 🔐 Security Best Practices

- ✅ Environment variables are encrypted by Vercel
- ✅ Never commit `.env.local` to GitHub (in `.gitignore`)
- ✅ Rotate Firebase credentials if exposed
- ✅ Update Firebase security rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📞 Getting Help

### Vercel Support:
- Documentation: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Support: https://vercel.com/support

### Firebase Support:
- Documentation: https://firebase.google.com/docs
- Community: https://firebase.google.com/community

---

## 🎉 Success Indicators

Your deployment is successful when:

✅ Vercel shows "Ready" status
✅ Live URL loads without errors
✅ Users can sign in with Google
✅ Matches are displayed
✅ Predictions can be made
✅ Dashboard shows user data
✅ Leaderboard displays rankings
✅ Mobile installation works

---

## 📝 Deployment URLs

After deployment, you'll have:

- **Production URL:** `https://your-project.vercel.app`
- **Preview URLs:** `https://fan-battle-git-[branch]-[user].vercel.app`
- **Deployment-specific:** `https://fan-battle-[hash].vercel.app`

Share the Production URL with your users!

---

**Built with ❤️ for Nepal Premier League**

🏏 Good luck with your predictions!

