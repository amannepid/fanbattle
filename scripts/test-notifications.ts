/**
 * Test script to verify notification system setup
 * Usage: tsx scripts/test-notifications.ts
 */

import { getNotificationManager } from '../lib/notifications';
import { NotificationType, NotificationPriority } from '../lib/notifications';

async function testNotifications() {
  console.log('🧪 Testing Notification System...\n');

  try {
    const manager = getNotificationManager();
    
    // Initialize
    console.log('1. Initializing notification manager...');
    await manager.initialize();
    console.log('✅ Manager initialized\n');

    // Test notification
    console.log('2. Sending test notification...');
    const testNotification = {
      id: `test-${Date.now()}`,
      type: NotificationType.CUTOFF_REMINDER,
      userId: 'test-user',
      title: 'Test Notification',
      body: 'This is a test notification from the notification system!',
      data: {
        matchId: 'test-match',
        matchNumber: 1,
        url: '/',
      },
      priority: NotificationPriority.NORMAL,
      createdAt: new Date(),
    };

    const result = await manager.send(testNotification);
    
    if (result.success) {
      console.log('✅ Test notification sent successfully!');
      console.log(`   Channel: ${result.channel}`);
    } else {
      console.log('⚠️  Test notification failed:');
      console.log(`   Error: ${result.error}`);
      console.log(`   Retryable: ${result.retryable}`);
    }

    console.log('\n✅ Test completed!');
    console.log('\nNext steps:');
    console.log('1. Check browser console for notification logs');
    console.log('2. Verify service worker is registered');
    console.log('3. Check Firestore for notification logs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testNotifications();

