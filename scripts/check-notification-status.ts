/**
 * Check notification system status
 * Usage: tsx scripts/check-notification-status.ts <userId>
 */

import { getNotificationManager } from '../lib/notifications';
import { firestoreStorage } from '../lib/notifications';

async function checkStatus() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('❌ Please provide a user ID');
    console.log('Usage: tsx scripts/check-notification-status.ts <userId>');
    process.exit(1);
  }

  console.log('🔍 Checking Notification Status...\n');
  console.log(`User ID: ${userId}\n`);

  try {
    const manager = getNotificationManager();
    await manager.initialize();

    // Get status
    const status = await manager.getStatus(userId);
    
    console.log('📊 Notification Status:');
    console.log('─────────────────────');
    console.log(`Enabled: ${status.enabled ? '✅' : '❌'}`);
    console.log(`Permission Granted: ${status.permissionGranted ? '✅' : '❌'}`);
    console.log('\nChannels:');
    console.log(`  Local: ${status.channels.local?.enabled ? '✅ Enabled' : '❌ Disabled'} (Available: ${status.channels.local?.available ? 'Yes' : 'No'})`);
    console.log(`  FCM: ${status.channels.fcm?.enabled ? '✅ Enabled' : '❌ Disabled'} (Available: ${status.channels.fcm?.available ? 'Yes' : 'No'}, Subscribed: ${status.channels.fcm?.subscribed ? 'Yes' : 'No'})`);
    
    console.log('\nPreferences:');
    console.log(`  Cutoff Reminders: ${status.preferences.cutoffReminders ? '✅' : '❌'}`);
    console.log(`  Match Available: ${status.preferences.matchAvailable ? '✅' : '❌'}`);

    // Check Firestore subscription
    const subscription = await firestoreStorage.getSubscription(userId);
    if (subscription) {
      console.log('\n✅ Subscription found in Firestore');
      console.log(`   Created: ${subscription.createdAt.toISOString()}`);
      console.log(`   Updated: ${subscription.updatedAt.toISOString()}`);
    } else {
      console.log('\n⚠️  No subscription found in Firestore');
      console.log('   Run: Subscribe to notifications in the app');
    }

    // Check notification logs
    const logs = await firestoreStorage.getNotificationLogs(userId, 5);
    if (logs.length > 0) {
      console.log(`\n📝 Recent Notification Logs (${logs.length}):`);
      logs.forEach(log => {
        console.log(`   ${log.status === 'sent' ? '✅' : '❌'} ${log.type} via ${log.channel} - ${log.createdAt.toISOString()}`);
      });
    } else {
      console.log('\n📝 No notification logs yet');
    }

  } catch (error) {
    console.error('❌ Error checking status:', error);
    process.exit(1);
  }
}

checkStatus();

