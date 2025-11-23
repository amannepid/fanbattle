import { Platform, platformDetector } from './platform-detector';

export interface PlatformCapabilities {
  notifications: boolean;
  serviceWorker: boolean;
  fcm: boolean;
  localNotifications: boolean;
  pushAPI: boolean;
  platform: Platform;
  pwaInstalled: boolean;
}

class CapabilityChecker {
  private capabilities: PlatformCapabilities | null = null;

  async getCapabilities(): Promise<PlatformCapabilities> {
    if (this.capabilities !== null) {
      return this.capabilities;
    }

    const platform = platformDetector.detect();
    const pwaInstalled = await platformDetector.isPWAInstalled();

    this.capabilities = {
      notifications: await this.checkNotificationSupport(),
      serviceWorker: this.checkServiceWorkerSupport(),
      fcm: this.checkFCMSupport(),
      localNotifications: await this.checkLocalNotificationSupport(),
      pushAPI: this.checkPushAPISupport(),
      platform,
      pwaInstalled,
    };

    return this.capabilities;
  }

  async checkNotificationSupport(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!('Notification' in window)) {
      return false;
    }

    // Check if we can request permission
    try {
      const permission = Notification.permission;
      return permission !== 'denied';
    } catch {
      return false;
    }
  }

  checkServiceWorkerSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'serviceWorker' in navigator;
  }

  checkFCMSupport(): boolean {
    // FCM is supported if Firebase is configured
    // We'll check for messagingSenderId in config
    if (typeof window === 'undefined') {
      return false;
    }

    // Check if Firebase messaging is available
    try {
      // This will be checked when FCM provider is initialized
      return !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    } catch {
      return false;
    }
  }

  async checkLocalNotificationSupport(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!('Notification' in window)) {
      return false;
    }

    // iOS requires PWA to be installed for local notifications
    if (platformDetector.isIOS()) {
      const pwaInstalled = await platformDetector.isPWAInstalled();
      return pwaInstalled;
    }

    return true;
  }

  checkPushAPISupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'PushManager' in window && 'serviceWorker' in navigator;
  }

  reset(): void {
    this.capabilities = null;
  }
}

export const capabilityChecker = new CapabilityChecker();

