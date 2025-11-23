/**
 * Backend script to send FCM notifications
 * Run this via cron job every 15-30 minutes
 * 
 * Usage: tsx scripts/send-notifications.ts
 */

import { ServerNotificationScheduler } from '@/lib/notifications/schedulers/server-scheduler';

async function main() {
  console.log('Starting notification scheduler...');
  
  const scheduler = new ServerNotificationScheduler();
  
  try {
    await scheduler.checkAndTrigger();
    console.log('Notification check completed');
  } catch (error) {
    console.error('Error in notification scheduler:', error);
    process.exit(1);
  }
}

main();

