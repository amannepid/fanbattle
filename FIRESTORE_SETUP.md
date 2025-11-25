# Firestore Setup Guide

Complete guide for setting up Firestore security rules and indexes for the FanBattle project.

## Table of Contents

1. [Security Rules Setup](#security-rules-setup)
2. [Indexes Setup](#indexes-setup)
3. [Admin Configuration](#admin-configuration)
4. [Deployment](#deployment)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Security Rules Setup

### ⚠️ IMPORTANT: Your database should NOT be public!

Never use `allow read, write: if true;` in production. This allows anyone to read, modify, or delete your data.

### Quick Setup

1. **Copy the rules from `firestore.rules`** file
2. **Go to Firebase Console**: https://console.firebase.google.com/
3. **Select your project**
4. **Go to**: Firestore Database → Rules
5. **Paste the new rules**
6. **Update admin emails** (see [Admin Configuration](#admin-configuration))
7. **Click "Publish"**

### Rules Overview

The security rules provide:

#### ✅ Public Read (No Auth Required)
- **Tournaments** - Anyone can read
- **Teams** - Anyone can read
- **Players** - Anyone can read
- **Matches** - Anyone can read

#### ✅ Authenticated Users
- **User Entries** - Users can read/update their own
- **Predictions** - Users can read all (for battleground), but only create/update their own

#### ✅ Admin Only
- **Tournaments, Teams, Players, Matches** - Only admins can create/update
- **All Collections** - Admins have full access

---

## Indexes Setup

Firestore requires composite indexes for certain queries. The project includes a `firestore.indexes.json` file with all required indexes.

### Required Indexes

#### 1. Index for `getUserPredictions()` (Dashboard)

**Collection**: `predictions`

**Fields**:
- `userId` - Ascending
- `matchNumber` - Ascending

**Query Used**:
```typescript
where('userId', '==', userId)
orderBy('matchNumber', 'asc')
```

#### 2. Index for `getScheduledPredictionsToActivate()` (Cron Job)

**Collection**: `predictions`

**Fields**:
- `scheduledFor` - Ascending

**Query Used**:
```typescript
where('scheduledFor', '<=', now)
orderBy('scheduledFor', 'asc')
```

**Note**: This index is only needed if you're using the cron job. Client-side activation doesn't require it.

#### 3. Index for `getAllPredictions()` (Battleground)

**Collection**: `predictions`

**Fields**:
- `matchId` - Ascending
- `matchNumber` - Ascending

**Query Used**:
```typescript
where('matchId', 'in', batchMatchIds)
orderBy('matchNumber', 'asc')
```

### How to Create Indexes

#### Option 1: Using Firebase CLI (Recommended)

1. **Deploy indexes from `firestore.indexes.json`**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **Wait for indexes to build** (can take a few minutes)

#### Option 2: Manual Creation in Firebase Console

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. For each index above:
   - Enter Collection ID: `predictions`
   - Add fields with correct order (Ascending)
   - Click "Create"

#### Option 3: Auto-Prompt (Firestore will prompt you)

When you run queries that need indexes, Firestore will:
1. Show an error in console/logs
2. Provide a link to create the index automatically
3. Click the link and create the index

### Index Status

Indexes can take a few minutes to build, especially if you have a lot of data. Check status in Firebase Console:
- **Building** - Index is being created
- **Enabled** - Index is ready to use
- **Error** - Something went wrong (check error message)

---

## Admin Configuration

The security rules check for admin status using email. You need to update the `isAdmin()` function in `firestore.rules`.

### Option 1: Check Specific Emails (Quick Fix)

Open `firestore.rules` and update the `isAdmin()` function:

```javascript
function isAdmin() {
  return isAuthenticated() && 
    request.auth.token.email != null &&
    (
      request.auth.token.email.lower() == 'your-admin-email@example.com' ||
      request.auth.token.email.lower() == 'another-admin@example.com'
      // Add more admin emails here as needed
    );
}
```

**Important**: 
- Use lowercase emails (`.lower()` converts to lowercase)
- Use `==` (not `in`) for individual email checks
- Add `||` between multiple emails

### Option 2: Check Email Domain (Better for Multiple Admins)

```javascript
function isAdmin() {
  return isAuthenticated() && 
    request.auth.token.email.matches('.*@your-admin-domain\\.com');
}
```

### Option 3: Use Custom Claims (Most Secure - Recommended)

1. **Set custom claims using Firebase Admin SDK**:
   ```javascript
   // In your backend/admin script
   await admin.auth().setCustomUserClaims(uid, { admin: true });
   ```

2. **Update rules to check custom claim**:
   ```javascript
   function isAdmin() {
     return isAuthenticated() && 
       request.auth.token.admin == true;
   }
   ```

**Benefits of Custom Claims**:
- ✅ Doesn't expose admin emails in rules
- ✅ Can be changed without updating rules
- ✅ Works with any authentication method
- ✅ More secure

---

## Deployment

### Deploy Rules

**Option A: Firebase Console (Easiest)**
1. Copy the entire content of `firestore.rules`
2. Go to: https://console.firebase.google.com/
3. Select your project
4. Go to: Firestore Database → Rules
5. Paste the rules
6. Click "Publish"

**Option B: Firebase CLI**
```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

---

## Testing

### Test Security Rules

1. **Test as Regular User**:
   - Should be able to read tournaments, teams, players, matches
   - Should be able to create/update own predictions
   - Should NOT be able to update matches

2. **Test as Admin**:
   - Should be able to update matches
   - Should be able to update tournaments, teams, players

3. **Test as Unauthenticated**:
   - Should be able to read tournaments, teams, players, matches
   - Should NOT be able to create predictions

### Use Rules Simulator

Firebase Console has a Rules Simulator where you can test rules before publishing:
- Go to Firestore Database → Rules
- Click "Rules Simulator" tab
- Test different scenarios

### Test Indexes

After creating indexes, test the queries:
1. **Dashboard page** - Should load user predictions without errors
2. **Battleground page** - Should load all predictions without errors
3. **Cron job** - Check Vercel logs after it runs

---

## Troubleshooting

### Security Rules Issues

**If users can't create predictions:**
- Check that `request.resource.data.userId == request.auth.uid`
- Verify user is authenticated
- Check browser console for permission denied errors

**If admin can't update matches:**
- Check `isAdmin()` function
- Verify admin email matches the rule
- Consider using custom claims instead

**If battleground doesn't load:**
- Check that `allow read: if isAuthenticated()` for predictions
- Verify users are authenticated

### Index Issues

**If queries still fail after creating indexes:**
1. Wait a few minutes for indexes to finish building
2. Check Firebase Console → Firestore → Indexes for status
3. Verify field names match exactly (case-sensitive)
4. Check Firestore rules allow the queries
5. Look for error messages in browser console or Vercel logs

**If you see "Missing Index" errors:**
- Firestore will provide a link to create the index automatically
- Click the link and create the index
- Or create manually using the instructions above

### How to Check if Indexes are Needed

1. **Run the app in production/dev**
2. **Check Firebase Console → Firestore → Indexes**
3. **Look for "Missing Index" errors** in:
   - Browser console (client-side)
   - Vercel logs (server-side/cron jobs)
4. **If you see errors**, they will include a link to create the index automatically

---

## Security Best Practices

1. ✅ **Never use `allow read, write: if true;` in production**
2. ✅ **Use custom claims for admin status** (more secure than email)
3. ✅ **Test rules thoroughly before publishing**
4. ✅ **Review rules regularly** as your app grows
5. ✅ **Use Rules Simulator** to test edge cases
6. ✅ **Keep indexes up to date** as queries change

---

## Need Help?

If you encounter issues:
1. Check Firebase Console → Firestore → Rules for error messages
2. Use Rules Simulator to debug
3. Check browser console for permission denied errors
4. Verify user authentication status
5. Check Vercel logs for server-side errors

