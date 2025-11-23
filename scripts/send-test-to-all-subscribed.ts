/**
 * Script to send a test notification to all subscribed users
 * 
 * Usage:
 *   npx tsx scripts/send-test-to-all-subscribed.ts
 * 
 * Or with Node:
 *   ts-node scripts/send-test-to-all-subscribed.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!serviceAccount) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
    process.exit(1);
  }

  try {
    const serviceAccountKey = JSON.parse(serviceAccount);
    initializeApp({
      credential: cert(serviceAccountKey),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = getFirestore();
const messaging = getMessaging();

async function sendTestNotificationToAll() {
  try {
    console.log('📡 Fetching all notification subscriptions...');
    
    // Get all subscriptions
    const subscriptionsSnapshot = await db.collection('notificationSubscriptions').get();
    
    if (subscriptionsSnapshot.empty) {
      console.log('ℹ️  No subscriptions found. No notifications to send.');
      return;
    }

    console.log(`📋 Found ${subscriptionsSnapshot.size} subscription(s)`);

    const messages: Message[] = [];
    let fcmCount = 0;
    let localOnlyCount = 0;

    subscriptionsSnapshot.forEach((doc) => {
      const subscription = doc.data();
      const userId = doc.id;

      // Check if user has FCM subscription
      if (subscription.channels?.fcm?.enabled && subscription.channels?.fcm?.token) {
        const token = subscription.channels.fcm.token;
        
        const message: Message = {
          token: token,
          notification: {
            title: '🧪 Test Notification - NPL Fan Battle',
            body: 'This is a test notification sent to all subscribed users! Match #1 (Team A vs Team B) cutoff in 2 hours. Make your prediction!',
          },
          data: {
            type: 'cutoff_reminder',
            notificationId: `test-all-${Date.now()}`,
            matchId: 'test-match-123',
            matchNumber: '1',
            teamAName: 'Team A',
            teamBName: 'Team B',
            url: '/predict/test-match-123',
          },
          webpush: {
            notification: {
              icon: '/logo.png',
              badge: '/logo.png',
              requireInteraction: false,
            },
            fcmOptions: {
              link: '/predict/test-match-123',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        };

        messages.push(message);
        fcmCount++;
        console.log(`  ✓ Added FCM token for user: ${userId}`);
      } else {
        localOnlyCount++;
        console.log(`  ⚠️  User ${userId} only has local notifications (cannot send from server)`);
      }
    });

    if (messages.length === 0) {
      console.log('ℹ️  No FCM tokens found. All users only have local notifications.');
      console.log('   Note: Local notifications can only be sent from the client side.');
      return;
    }

    console.log(`\n📤 Sending ${messages.length} notification(s) via FCM...`);
    console.log(`   - FCM subscriptions: ${fcmCount}`);
    console.log(`   - Local only: ${localOnlyCount}\n`);

    // Send notifications in batches (FCM allows up to 500 per batch)
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      try {
        const responses = await messaging.sendAll(batch);
        
        responses.responses.forEach((response, index) => {
          if (response.success) {
            successCount++;
            console.log(`  ✅ Sent to token ${i + index + 1}/${messages.length}`);
          } else {
            failureCount++;
            console.error(`  ❌ Failed to send to token ${i + index + 1}:`, response.error?.message);
          }
        });
      } catch (error) {
        console.error(`  ❌ Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);
        failureCount += batch.length;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully sent: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📱 Total FCM subscriptions: ${fcmCount}`);
    console.log(`   💻 Local only (not sent): ${localOnlyCount}`);

    if (successCount > 0) {
      console.log('\n✅ Test notifications sent successfully!');
      console.log('   Check your devices for the notification.');
    }

  } catch (error) {
    console.error('❌ Error sending test notifications:', error);
    process.exit(1);
  }
}

// Run the script
sendTestNotificationToAll()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

