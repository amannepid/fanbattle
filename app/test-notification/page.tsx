'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getNotificationManager, NotificationType, NotificationPriority } from '@/lib/notifications';
import { Bell, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestNotificationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sendTestNotification = async () => {
    if (!user) {
      setResult({ success: false, message: 'Please log in first' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const manager = getNotificationManager();
      await manager.initialize();

      const testNotification = {
        id: `test-${Date.now()}`,
        type: NotificationType.CUTOFF_REMINDER,
        userId: user.uid,
        title: 'Test Notification - Match Reminder',
        body: 'This is a test notification! Match #1 (Team A vs Team B) cutoff in 2 hours. Make your prediction!',
        data: {
          matchId: 'test-match-123',
          matchNumber: 1,
          teamAName: 'Team A',
          teamBName: 'Team B',
          url: '/predict/test-match-123',
        },
        priority: NotificationPriority.HIGH,
        createdAt: new Date(),
      };

      const notificationResult = await manager.send(testNotification);

      if (notificationResult.success) {
        setResult({
          success: true,
          message: `✅ Notification sent successfully via ${notificationResult.channel}! Check your notifications.`,
        });
      } else {
        setResult({
          success: false,
          message: `❌ Failed to send notification: ${notificationResult.error}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = () => {
    if (!mounted || typeof window === 'undefined' || !('Notification' in window)) {
      return 'not-supported';
    }
    return Notification.permission;
  };

  const requestPermission = async () => {
    console.log('🔔 Request Permission button clicked');
    setLoading(true);
    setResult({ success: false, message: 'Requesting permission...' });

    // Immediate feedback
    console.log('Checking environment...');
    
    if (typeof window === 'undefined') {
      console.error('Window is undefined');
      setResult({ success: false, message: 'Window is not available' });
      setLoading(false);
      return;
    }

    if (!('Notification' in window)) {
      console.error('Notification API not available');
      setResult({ success: false, message: 'Notifications not supported in this browser' });
      setLoading(false);
      return;
    }

    try {
      const currentPermission = Notification.permission;
      console.log('📱 Current permission before request:', currentPermission);
      
      // Show immediate feedback
      setResult({ 
        success: false, 
        message: `Current permission: ${currentPermission}. Requesting...` 
      });
      
      // Even if denied, try to request - this helps the site appear in settings
      // On some browsers, this might work even if previously denied
      let permission: NotificationPermission;
      
      console.log('📞 Calling Notification.requestPermission()...');
      
      try {
        // This is the critical call - it should show a browser prompt
        permission = await Notification.requestPermission();
        console.log('✅ Permission result:', permission);
      } catch (requestError: any) {
        console.error('❌ Error calling requestPermission:', requestError);
        console.error('Error details:', {
          name: requestError?.name,
          message: requestError?.message,
          code: requestError?.code,
        });
        // If requestPermission fails, check current state
        permission = Notification.permission;
        console.log('Using current permission after error:', permission);
      }

      // Update result based on permission
      if (permission === 'granted') {
        setResult({
          success: true,
          message: '✅ Permission granted! You can now send test notifications.',
        });
      } else if (permission === 'denied') {
        setResult({
          success: false,
          message: 'Permission denied. To enable:\n' +
            '1. Tap the 3-dot menu (⋮) in Chrome\n' +
            '2. Tap "Settings" → "Site settings" → "Notifications"\n' +
            '3. Find this site and change to "Allow"\n\n' +
            'Note: The site should now appear in the notifications list.',
        });
      } else {
        setResult({
          success: false,
          message: `Permission is "${permission}". Please try again or check browser settings.`,
        });
      }
    } catch (error: any) {
      console.error('❌ Error in requestPermission:', error);
      console.error('Error stack:', error?.stack);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}\n\nCheck the browser console (F12) for more details.`,
      });
    } finally {
      setLoading(false);
      console.log('🔔 Request Permission function completed');
    }
  };

  const permission = checkPermission();

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Test Notifications
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Send a test notification to verify the notification system is working.
      </p>

      {!user && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            Please log in to test notifications.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Permission Status */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Permission Status
          </h2>
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Permission: Granted ✅</span>
              </>
            ) : permission === 'denied' ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Permission: Denied ❌
                </span>
              </>
            ) : permission === 'not-supported' ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Notifications not supported in this browser
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">Permission: Not granted yet</span>
              </>
            )}
          </div>

          {/* Always show request button if not granted */}
          {permission !== 'granted' && permission !== 'not-supported' && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔘 Button clicked!', { loading, permission });
                  requestPermission();
                }}
                onTouchStart={(e) => {
                  // For mobile touch events
                  console.log('👆 Touch start on button');
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors w-full sm:w-auto flex items-center justify-center gap-2 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  'Request Permission'
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {permission === 'default' 
                  ? 'This will show a browser popup asking for notification permission'
                  : 'Try requesting again - this will make the site appear in Chrome settings'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Check browser console (F12) for debug logs
              </p>
            </div>
          )}

          {permission === 'denied' && (
            <div className="mt-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                  How to enable notifications for IP address:
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded mb-2">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-semibold mb-1">
                    Method 1: Via Site Settings (Recommended)
                  </p>
                  <ol className="text-xs text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                    <li>While on this page, tap the <strong>lock icon (🔒)</strong> or <strong>info icon (i)</strong> in the address bar</li>
                    <li>Tap <strong>"Site settings"</strong> or <strong>"Permissions"</strong></li>
                    <li>Tap <strong>"Notifications"</strong></li>
                    <li>Change from <strong>"Block"</strong> to <strong>"Allow"</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <p className="text-xs text-green-800 dark:text-green-200 font-semibold mb-1">
                    Method 2: Via Chrome Settings
                  </p>
                  <ol className="text-xs text-green-700 dark:text-green-300 list-decimal list-inside space-y-1">
                    <li>Tap the 3-dot menu (⋮) in Chrome</li>
                    <li>Tap <strong>"Settings"</strong></li>
                    <li>Tap <strong>"Site settings"</strong></li>
                    <li>Tap <strong>"Notifications"</strong></li>
                    <li>Look for <strong>{typeof window !== 'undefined' ? window.location.host : 'your-ip:3000'}</strong></li>
                    <li>If not found, tap <strong>"Add"</strong> and enter: <strong>{typeof window !== 'undefined' ? window.location.origin : 'http://your-ip:3000'}</strong></li>
                    <li>Change to <strong>"Allow"</strong></li>
                  </ol>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  <strong>Note:</strong> IP addresses may not always appear in the list. Use Method 1 (lock icon) for direct access.
                </p>
              </div>
            </div>
          )}

          {/* Debug info */}
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Current permission state: <strong>{permission}</strong></p>
            <p>Window available: {typeof window !== 'undefined' ? 'Yes' : 'No'}</p>
            <p>Notification API available: {typeof window !== 'undefined' && 'Notification' in window ? 'Yes' : 'No'}</p>
            <p>Site URL: <strong>{typeof window !== 'undefined' ? window.location.href : 'N/A'}</strong></p>
            <p>Site origin: <strong>{typeof window !== 'undefined' ? window.location.origin : 'N/A'}</strong></p>
            <p>Site host: <strong>{typeof window !== 'undefined' ? window.location.host : 'N/A'}</strong></p>
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <p className="text-yellow-800 dark:text-yellow-200 font-semibold text-xs">⚠️ IP Address Note:</p>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                Chrome may not show IP addresses in the notification settings list. 
                Try looking for <strong>{typeof window !== 'undefined' ? window.location.host : 'your-ip:3000'}</strong> 
                or use the manual method below.
              </p>
            </div>
          </div>
        </div>

        {/* Send Test Notification */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Send Test Notification
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This will send a test notification through the notification system. You should see it
            appear as a system notification.
          </p>
          <button
            onClick={sendTestNotification}
            disabled={loading || !user || permission !== 'granted'}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="h-5 w-5" />
                Send Test Notification
              </>
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg p-4 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <p
              className={
                result.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }
            >
              {result.message}
            </p>
          </div>
        )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Testing Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
                <li>Make sure you're logged in</li>
                <li>Grant notification permission if prompted</li>
                <li>Click "Send Test Notification"</li>
                <li>Check your system notifications (outside the browser)</li>
                <li>Click on the notification to verify it navigates correctly</li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                ⚠️ Not Working? Try This:
              </h3>
              <div className="text-sm text-red-800 dark:text-red-300 space-y-2">
                <p><strong>1. Simple Test Page:</strong></p>
                <p>Go to <a href="/test-notification-simple" className="underline">/test-notification-simple</a> for a basic test</p>
                
                <p><strong>2. Check Browser Console:</strong></p>
                <p>Open Chrome DevTools (F12 or remote debugging) and check for errors</p>
                
                <p><strong>3. Try Different Method:</strong></p>
                <p>On mobile, Chrome may require HTTPS. Try using ngrok or deploy to production.</p>
                
                <p><strong>4. Manual Enable (Most Reliable):</strong></p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>While on this page, tap the <strong>lock icon (🔒)</strong> in address bar</li>
                  <li>Tap <strong>"Site settings"</strong></li>
                  <li>Scroll to <strong>"Notifications"</strong></li>
                  <li>Change to <strong>"Allow"</strong></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
      </div>
    </div>
  );
}

