/**
 * Test sending a notification through the notification system
 * This will create a log entry in Firestore
 * Usage: Run this from browser console or create an API endpoint
 */

// This would be used in browser console or as an API route
// For now, let's create a browser console version

export const testNotificationThroughSystem = `
// Copy and paste this into browser console
(async function() {
  try {
    // Get the notification manager
    const { getNotificationManager, NotificationType, NotificationPriority } = await import('/lib/notifications/index.ts');
    const manager = getNotificationManager();
    
    // Create a test notification
    const testNotification = {
      id: 'test-' + Date.now(),
      type: 'cutoff_reminder',
      userId: 'test-user-1-id',
      title: 'Test Notification via System',
      body: 'This notification was sent through our notification system!',
      data: {
        matchId: 'test-match',
        matchNumber: 1,
        url: '/',
      },
      priority: 'normal',
      createdAt: new Date(),
    };
    
    console.log('Sending notification through system...');
    const result = await manager.send(testNotification);
    
    if (result.success) {
      console.log('✅ Notification sent successfully!');
      console.log('Channel:', result.channel);
      console.log('Check Firestore notificationLogs collection now!');
    } else {
      console.log('❌ Notification failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
`;

