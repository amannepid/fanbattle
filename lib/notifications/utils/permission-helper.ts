/**
 * Helper utilities for managing notification permissions
 */

export type PermissionState = 'default' | 'granted' | 'denied';

export class NotificationPermissionHelper {
  /**
   * Check if notifications are supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'Notification' in window;
  }

  /**
   * Get current permission state
   */
  static getPermission(): PermissionState {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission as PermissionState;
  }

  /**
   * Request notification permission
   * Returns the new permission state
   * Note: If permission is already "denied", this will return "denied" without showing a prompt
   */
  static async requestPermission(): Promise<PermissionState> {
    if (!this.isSupported()) {
      return 'denied';
    }

    const currentPermission = Notification.permission;
    
    // If already granted, return immediately
    if (currentPermission === 'granted') {
      return 'granted';
    }

    // If denied, we can't request again - user must change in browser settings
    if (currentPermission === 'denied') {
      return 'denied';
    }

    // If default, we can request
    try {
      const permission = await Notification.requestPermission();
      return permission as PermissionState;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if we can request permission (i.e., it's in "default" state)
   */
  static canRequest(): boolean {
    return this.getPermission() === 'default';
  }

  /**
   * Check if permission is granted
   */
  static isGranted(): boolean {
    return this.getPermission() === 'granted';
  }

  /**
   * Check if permission is denied (and can't be requested again)
   */
  static isDenied(): boolean {
    return this.getPermission() === 'denied';
  }

  /**
   * Get instructions for enabling notifications if denied
   */
  static getEnableInstructions(): string {
    if (typeof window === 'undefined') {
      return 'Go to browser settings → Site permissions → Notifications → Allow';
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    // Mobile Chrome (Android)
    if (isMobile && userAgent.includes('chrome') && userAgent.includes('android')) {
      return '1. Tap the 3-dot menu (⋮) in the top right\n' +
             '2. Tap "Settings"\n' +
             '3. Tap "Site settings"\n' +
             '4. Tap "Notifications"\n' +
             '5. Find this site and tap it\n' +
             '6. Change to "Allow"';
    }
    
    // Mobile Chrome (iOS) - uses Safari WebKit
    if (isMobile && userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return '1. Tap the "aA" icon in the address bar\n' +
             '2. Tap "Website Settings"\n' +
             '3. Tap "Notifications"\n' +
             '4. Change to "Allow"';
    }
    
    // Desktop Chrome
    if (userAgent.includes('chrome') && !isMobile) {
      return '1. Click the lock icon (🔒) in the address bar\n' +
             '2. Click "Site settings"\n' +
             '3. Find "Notifications" and change to "Allow"';
    }
    
    // Firefox
    if (userAgent.includes('firefox')) {
      if (isMobile) {
        return '1. Tap the 3-dot menu (⋮)\n' +
               '2. Tap "Settings"\n' +
               '3. Tap "Privacy & Security"\n' +
               '4. Tap "Permissions"\n' +
               '5. Tap "Notifications" and allow for this site';
      }
      return '1. Click the lock icon in the address bar\n' +
             '2. Click "Permissions"\n' +
             '3. Find "Notifications" and change to "Allow"';
    }
    
    // Safari
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return '1. Safari → Settings (gear icon)\n' +
             '2. Tap "Websites"\n' +
             '3. Tap "Notifications"\n' +
             '4. Find this site and change to "Allow"';
    }
    
    // Edge
    if (userAgent.includes('edge')) {
      if (isMobile) {
        return '1. Tap the 3-dot menu (⋮)\n' +
               '2. Tap "Settings"\n' +
               '3. Tap "Site permissions"\n' +
               '4. Tap "Notifications" and allow for this site';
      }
      return '1. Click the lock icon in the address bar\n' +
             '2. Click "Permissions"\n' +
             '3. Find "Notifications" and change to "Allow"';
    }
    
    return 'Go to browser settings → Site permissions → Notifications → Allow';
  }
}

