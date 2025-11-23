/**
 * Backend script to send FCM notifications
 * Run this via cron job every 15-30 minutes
 * 
 * Usage: 
 *   Normal mode: tsx scripts/send-notifications.ts
 *   Test mode: NOTIFICATION_TEST_MODE=true tsx scripts/send-notifications.ts
 * 
 * To enable test mode, set environment variable:
 *   NOTIFICATION_TEST_MODE=true
 * 
 * To disable test mode (back to normal), remove or set to false:
 *   NOTIFICATION_TEST_MODE=false
 *   (or unset the variable)
 */

import { ServerNotificationScheduler } from '@/lib/notifications/schedulers/server-scheduler';

async function main() {
  const testMode = process.env.NOTIFICATION_TEST_MODE === 'true' || process.env.NOTIFICATION_TEST_MODE === '1';
  
  if (testMode) {
    console.log('🧪 TEST MODE ENABLED');
    console.log('   Sending test notifications to all subscribed users...');
    console.log('   To disable test mode, set NOTIFICATION_TEST_MODE=false or remove the variable\n');
  } else {
    console.log('📅 Production mode - Checking for cutoff reminders...\n');
  }
  
  const scheduler = new ServerNotificationScheduler();
  
  try {
    await scheduler.checkAndTrigger();
    
    if (testMode) {
      console.log('\n✅ Test notifications sent successfully!');
      console.log('   To return to normal mode, set NOTIFICATION_TEST_MODE=false');
    } else {
      console.log('✅ Notification check completed');
    }
  } catch (error) {
    console.error('❌ Error in notification scheduler:', error);
    process.exit(1);
  }
}

main();

