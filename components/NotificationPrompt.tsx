'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getNotificationManager } from '@/lib/notifications';
import { X, Bell } from 'lucide-react';
import { platformDetector, Platform } from '@/lib/notifications';

export function NotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const checkPermission = async () => {
      const manager = getNotificationManager();
      const status = await manager.getStatus(user.uid);

      // Show prompt if permission not granted
      if (!status.permissionGranted) {
        // Check if iOS
        const platform = platformDetector.detect();
        const ios = platform === Platform.IOS;
        setIsIOS(ios);

        if (ios) {
          const pwaInstalled = await platformDetector.isPWAInstalled();
          setIsPWAInstalled(pwaInstalled);
        }

        // Only show if not dismissed recently
        const dismissed = localStorage.getItem('notification-prompt-dismissed');
        if (!dismissed) {
          setShow(true);
        }
      }
    };

    checkPermission();
  }, [user]);

  const handleEnable = async () => {
    if (!user) return;

    try {
      // First request permission if needed
      const { NotificationPermissionHelper } = await import('@/lib/notifications/utils/permission-helper');
      
      if (NotificationPermissionHelper.canRequest()) {
        const permission = await NotificationPermissionHelper.requestPermission();
        if (permission !== 'granted') {
          setResult({
            success: false,
            message: `Permission ${permission}. ${permission === 'denied' ? NotificationPermissionHelper.getEnableInstructions() : 'Please try again.'}`,
          });
          return;
        }
      } else if (NotificationPermissionHelper.isDenied()) {
        setResult({
          success: false,
          message: `Permission denied. ${NotificationPermissionHelper.getEnableInstructions()}`,
        });
        return;
      }

      // Now subscribe to notifications
      const manager = getNotificationManager();
      await manager.subscribe(user.uid);
      setShow(false);
      setResult({
        success: true,
        message: '✅ Notifications enabled successfully!',
      });
      localStorage.setItem('notification-prompt-dismissed', 'true');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!show || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-4 sm:w-96 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Enable Notifications
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Get reminders when match prediction deadlines are approaching!
        </p>

        {isIOS && !isPWAInstalled && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>iOS Users:</strong> Please add this app to your Home Screen first for notifications to work.
              Tap the Share button and select &quot;Add to Home Screen&quot;.
            </p>
          </div>
        )}

        {result && (
          <div
            className={`rounded-lg p-3 mb-4 ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <p
              className={`text-sm ${
                result.success
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}
            >
              {result.message}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

