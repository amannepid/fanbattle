# Notification System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Setup & Configuration](#setup--configuration)
5. [How It Works](#how-it-works)
6. [Platform Support](#platform-support)
7. [Notification Types](#notification-types)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)
11. [Performance & Optimization](#performance--optimization)
12. [Future Enhancements](#future-enhancements)

---

## Overview

The notification system is a modular, scalable solution for sending push notifications to users of the NPL Fan Battle PWA. It supports multiple notification channels (Local and FCM) with automatic fallback, platform-specific optimizations, and both client-side and server-side scheduling.

### Key Capabilities

- ✅ **Cutoff Reminders**: Automatically reminds users 2 hours before prediction deadline
- ✅ **Multi-Channel Support**: Local notifications (primary) + FCM (fallback)
- ✅ **Platform-Aware**: Optimized for Android, iOS, and Desktop
- ✅ **Client + Server Scheduling**: Works when app is open and closed
- ✅ **Graceful Degradation**: Falls back to local notifications if FCM unavailable
- ✅ **Test Mode**: Easy testing without waiting for real matches

---

## Architecture

### High-Level Flow

```
User Opens App
    ↓
NotificationInitializer
    ↓
NotificationManager.initialize()
    ↓
Subscribe to Channels (Local + FCM)
    ↓
Client Scheduler Starts (checks every 15 min)
    ↓
Server Cron Job Runs (daily at 6 PM CST)
    ↓
Rule Engine Evaluates Conditions
    ↓
Send Notifications via Best Available Channel
```

### Module Structure

```
lib/notifications/
├── core/                    # Core orchestration
│   ├── notification-manager.ts    # Main facade
│   ├── types.ts                   # Type definitions
│   └── result.ts                  # Result types
├── channels/                # Notification delivery channels
│   ├── local-channel.ts           # Browser Notification API
│   ├── fcm-channel.ts             # Firebase Cloud Messaging
│   ├── channel-factory.ts         # Channel creation
│   └── channel-selector.ts        # Channel selection logic
├── providers/               # Low-level providers
│   ├── local-provider.ts          # Notification API wrapper
│   └── fcm-provider.ts           # FCM SDK wrapper
├── schedulers/              # Scheduling logic
│   ├── client-scheduler.ts        # Client-side (15 min intervals)
│   ├── server-scheduler.ts        # Server-side (cron job)
│   ├── rule-engine.ts            # Rule evaluation
│   └── rules/
│       └── cutoff-reminder-rule.ts
├── storage/                 # Data persistence
│   ├── firestore-storage.ts      # Firestore implementation
│   └── storage.interface.ts      # Storage contract
├── handlers/                # Event & click handlers
│   ├── event-handler.ts          # Event bus
│   └── click-handler.ts         # Notification clicks
├── platform/                # Platform detection
│   ├── platform-detector.ts      # Detect iOS/Android/Desktop
│   └── capability-checker.ts    # Check capabilities
├── utils/                   # Utilities
│   ├── logger.ts                 # Structured logging
│   ├── error-handler.ts          # Error classification
│   ├── retry-handler.ts         # Retry logic
│   └── permission-helper.ts    # Permission management
└── config/                  # Configuration
    └── config.ts                 # Config management
```

---

## Features

### 1. Multi-Channel Support

**Local Notifications** (Primary)
- Works on Android, Desktop, and iOS (when app is open)
- No server setup required
- Immediate delivery
- Limited to when app is active

**FCM** (Fallback)
- Works when app is closed (Android/Desktop)
- Requires Firebase setup
- Background delivery
- iOS requires APNs configuration (optional)

### 2. Smart Channel Selection

The system automatically selects the best channel:
1. **Android/Desktop**: Tries Local first, falls back to FCM
2. **iOS**: Uses Local when app is open, FCM skipped if APNs not configured

### 3. Dual Scheduling

**Client-Side Scheduler**
- Runs every 15 minutes when app is open
- Uses local notifications
- Immediate feedback for active users

**Server-Side Scheduler**
- Runs daily at 6 PM CST (midnight UTC)
- Uses FCM for background delivery
- Catches users who haven't opened the app

### 4. Rule-Based System

Notifications are triggered by rules:
- **Cutoff Reminder Rule**: Sends reminder 2 hours before deadline
- Extensible: Easy to add new rules (match available, score updates, etc.)

---

## Setup & Configuration

### 1. Environment Variables

**Required:**
```bash
# Firebase VAPID Key (for FCM)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Firebase Service Account (for server-side FCM)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Optional:**
```bash
# Enable test mode (sends test notifications to all users)
NOTIFICATION_TEST_MODE=true

# Cron job security (optional)
CRON_SECRET=your-secret-key

# Configuration overrides
NEXT_PUBLIC_NOTIFICATION_CHECK_INTERVAL=900000  # 15 minutes
NEXT_PUBLIC_NOTIFICATION_CUTOFF_HOURS=2
```

### 2. Firebase Setup

1. **Get VAPID Key**:
   - Firebase Console → Project Settings → Cloud Messaging
   - Generate Web Push Certificate
   - Copy the key pair

2. **Get Service Account Key**:
   - Firebase Console → Project Settings → Service Accounts
   - Generate New Private Key
   - Copy the JSON (single line for Vercel)

3. **APNs (iOS - Optional)**:
   - Apple Developer Portal → Create APNs Key
   - Upload to Firebase Console → Cloud Messaging
   - Only needed if you want background notifications on iOS

### 3. Vercel Cron Job

The cron job is configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/send-notifications",
    "schedule": "0 0 * * *"  // Daily at 6 PM CST (midnight UTC)
  }]
}
```

**Note**: Vercel Hobby plan only supports daily cron jobs.

### 4. Service Workers

Two service workers are required:
- `public/sw.js` - Main PWA service worker
- `public/firebase-messaging-sw.js` - FCM service worker

Both are automatically registered by the system.

---

## How It Works

### Initialization Flow

1. **User Opens App**:
   ```typescript
   NotificationInitializer component mounts
   → NotificationManager.initialize()
   → Registers channels (Local, FCM)
   → Subscribes user
   → Starts client scheduler
   ```

2. **Subscription Process**:
   ```typescript
   Request notification permission
   → Get FCM token (if available)
   → Store subscription in Firestore
   → Start periodic checks
   ```

### Notification Flow

1. **Rule Evaluation**:
   ```typescript
   Client/Server scheduler checks conditions
   → Rule engine evaluates rules
   → Generates notifications if conditions met
   ```

2. **Channel Selection**:
   ```typescript
   Platform detection (iOS/Android/Desktop)
   → Check channel availability
   → Select best channel (Local → FCM fallback)
   ```

3. **Delivery**:
   ```typescript
   Send via selected channel
   → Log result
   → Retry on failure (if retryable)
   ```

### Cutoff Reminder Logic

1. **Check Conditions**:
   - Active tournament exists
   - Matches on next match day
   - User hasn't predicted
   - Within 2 hours before cutoff

2. **Calculate Cutoff**:
   - Primary: 8 PM CST on previous day
   - Secondary: 6 hours before first match of day
   - Use earlier of the two

3. **Send Reminder**:
   - Title: "Match Prediction Reminder"
   - Body: "Match #X (Team A vs Team B) cutoff in Y hours. Make your prediction!"
   - Priority: URGENT if ≤1 hour, HIGH otherwise

---

## Platform Support

### Android

✅ **Full Support**
- Local notifications: ✅
- FCM background: ✅
- PWA installation: ✅
- Works in browser: ✅

### iOS

⚠️ **Limited Support** (without APNs)
- Local notifications: ✅ (when app is open)
- FCM background: ❌ (requires APNs)
- PWA installation: ✅ (required)
- Works in browser: ⚠️ (Safari only, iOS 16.4+)

**With APNs Configuration**:
- FCM background: ✅
- Full feature parity with Android

### Desktop

✅ **Full Support**
- Local notifications: ✅
- FCM background: ✅
- Works in Chrome, Edge, Firefox

---

## Notification Types

### Current Types

1. **CUTOFF_REMINDER**
   - Triggered: 2 hours before prediction deadline
   - Condition: User hasn't predicted
   - Priority: HIGH or URGENT

### Future Types (Planned)

- `MATCH_AVAILABLE`: New matches available for prediction
- `SCORE_UPDATE`: Match scores updated
- `LEADERBOARD_UPDATE`: Leaderboard changes

---

## Testing

### 1. Test Mode

Enable test mode to send notifications to all subscribed users:

```bash
# In Vercel Environment Variables
NOTIFICATION_TEST_MODE=true
```

Then trigger manually:
```bash
curl https://your-domain.vercel.app/api/cron/send-notifications
```

### 2. Test Page

Visit `/test-notification` to:
- Request notification permission
- Send test notification to yourself
- Check notification status
- View debug information

### 3. Browser Console

Check logs in browser console:
```javascript
// Check notification status
const manager = await import('/lib/notifications');
const status = await manager.getNotificationManager().getStatus('your-user-id');
console.log(status);
```

### 4. Vercel Logs

Check function logs in Vercel Dashboard:
- Go to Functions → `/api/cron/send-notifications`
- View execution logs
- Check for errors

---

## Troubleshooting

### Common Issues

#### 1. Notifications Not Received

**Check:**
- [ ] Notification permission granted
- [ ] User subscribed (check Firestore)
- [ ] FCM token exists (for FCM notifications)
- [ ] Service worker registered
- [ ] App is open (for local notifications)

**Solutions:**
- Request permission manually
- Check browser console for errors
- Verify Firestore subscription document
- Check Vercel logs for server-side errors

#### 2. iOS Notifications Not Working

**Causes:**
- APNs not configured (FCM won't work)
- PWA not installed to home screen
- Using Chrome instead of Safari
- iOS version < 16.4

**Solutions:**
- Use local notifications (works when app is open)
- Install PWA to home screen
- Use Safari browser
- Configure APNs for background notifications

#### 3. FCM Token Errors

**Error**: `messaging/invalid-registration-token`
- Token expired or invalid
- User needs to resubscribe

**Error**: `messaging/authentication-error`
- APNs not configured (iOS)
- Service account key invalid

**Solutions:**
- User should re-grant permission
- Check Firebase configuration
- Verify service account key

#### 4. Cron Job Not Running

**Check:**
- [ ] `vercel.json` has cron configuration
- [ ] Cron appears in Vercel Dashboard
- [ ] Schedule is valid (daily for Hobby plan)
- [ ] API route exists and is accessible

**Solutions:**
- Verify `vercel.json` configuration
- Check Vercel deployment logs
- Test endpoint manually: `curl /api/cron/send-notifications`

---

## API Reference

### NotificationManager

```typescript
// Initialize system
await manager.initialize(): Promise<void>

// Send notification
await manager.send(notification: Notification): Promise<NotificationResult>

// Subscribe user
await manager.subscribe(userId: string, preferences?: NotificationPreferences): Promise<void>

// Unsubscribe user
await manager.unsubscribe(userId: string): Promise<void>

// Get status
await manager.getStatus(userId: string): Promise<NotificationStatus>
```

### Notification Types

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt?: Date;
}
```

### NotificationResult

```typescript
type NotificationResult = 
  | { success: true; channel: string; sentAt: Date; notificationId?: string }
  | { success: false; error: string; retryable: boolean; channel?: string; errorCode?: string };
```

---

## Performance & Optimization

### Current Optimizations

1. **Batch Processing**: Server scheduler processes users in batches of 10
2. **Parallel Execution**: Uses `Promise.allSettled` for concurrent processing
3. **Graceful Error Handling**: Errors don't block other users' notifications
4. **Platform-Specific Skipping**: iOS FCM skipped if APNs not configured
5. **Efficient Filtering**: Only processes users with valid FCM subscriptions

### Performance Metrics

- **Client Scheduler**: Runs every 15 minutes (configurable)
- **Server Scheduler**: Runs daily at 6 PM CST
- **Batch Size**: 10 users per batch
- **Retry Logic**: 3 attempts with exponential backoff

### Monitoring

Check Vercel logs for:
- Notification send success/failure rates
- Error types and frequencies
- Processing times
- User subscription counts

---

## Future Enhancements

### Planned Features

1. **Additional Notification Types**:
   - Match available notifications
   - Score update notifications
   - Leaderboard update notifications

2. **Enhanced Scheduling**:
   - Multiple reminder times (e.g., 4 hours, 2 hours, 1 hour)
   - Customizable reminder preferences per user

3. **Analytics**:
   - Notification delivery rates
   - Click-through rates
   - User engagement metrics

4. **Advanced Features**:
   - Rich notifications (images, actions)
   - Notification grouping
   - Quiet hours / Do Not Disturb

### Configuration Options

Future environment variables:
```bash
NOTIFICATION_REMINDER_HOURS=4,2,1  # Multiple reminder times
NOTIFICATION_RICH_MEDIA=true      # Enable images
NOTIFICATION_QUIET_HOURS=22-8     # Quiet hours
```

---

## Maintenance

### Regular Tasks

1. **Monitor Logs**: Check Vercel function logs weekly
2. **Clean Invalid Tokens**: Remove expired FCM tokens from Firestore
3. **Update Dependencies**: Keep Firebase SDK updated
4. **Review Metrics**: Track notification delivery rates

### Firestore Collections

- `notificationSubscriptions`: User subscriptions
- `notificationPreferences`: User preferences
- `notificationLogs`: Notification delivery logs

### Cleanup Scripts

Consider creating scripts to:
- Remove invalid FCM tokens
- Clean old notification logs
- Update expired subscriptions

---

## Support & Resources

### Documentation Files

- `NOTIFICATION_SYSTEM_DOCUMENTATION.md` (this file)
- `IOS_FCM_SETUP.md` - iOS-specific setup
- `DEBUG_NOTIFICATIONS.md` - Debugging guide
- `NOTIFICATION_SETUP.md` - Initial setup guide

### Key Files

- `lib/notifications/` - Core notification system
- `app/api/cron/send-notifications/route.ts` - Cron endpoint
- `components/NotificationInitializer.tsx` - Client initialization
- `public/firebase-messaging-sw.js` - FCM service worker

### External Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## Version History

- **v1.0.0** (Current): Initial implementation
  - Cutoff reminder notifications
  - Multi-channel support (Local + FCM)
  - Client and server scheduling
  - Platform-aware delivery
  - iOS graceful degradation

---

**Last Updated**: 2025-01-23
**Maintained By**: Development Team

