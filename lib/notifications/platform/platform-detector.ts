export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}

class PlatformDetector {
  private static instance: PlatformDetector;
  private platform: Platform | null = null;
  private pwaInstalled: boolean | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): PlatformDetector {
    if (!PlatformDetector.instance) {
      PlatformDetector.instance = new PlatformDetector();
    }
    return PlatformDetector.instance;
  }

  detect(): Platform {
    if (this.platform !== null) {
      return this.platform;
    }

    if (typeof window === 'undefined') {
      this.platform = Platform.UNKNOWN;
      return this.platform;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform.toLowerCase();

    // iOS detection
    if (
      /iphone|ipad|ipod/.test(userAgent) ||
      (platform === 'macintel' && 'ontouchend' in document)
    ) {
      this.platform = Platform.IOS;
      return this.platform;
    }

    // Android detection
    if (/android/.test(userAgent)) {
      this.platform = Platform.ANDROID;
      return this.platform;
    }

    // Desktop detection (Windows, Mac, Linux)
    if (
      /win|mac|linux/.test(platform) ||
      (!/mobile|android|iphone|ipad/.test(userAgent))
    ) {
      this.platform = Platform.DESKTOP;
      return this.platform;
    }

    this.platform = Platform.UNKNOWN;
    return this.platform;
  }

  isIOS(): boolean {
    return this.detect() === Platform.IOS;
  }

  isAndroid(): boolean {
    return this.detect() === Platform.ANDROID;
  }

  isDesktop(): boolean {
    return this.detect() === Platform.DESKTOP;
  }

  async isPWAInstalled(): Promise<boolean> {
    if (this.pwaInstalled !== null) {
      return this.pwaInstalled;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    // Check if running in standalone mode (PWA installed)
    const isStandalone = 
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Check if installed via beforeinstallprompt
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone;

    this.pwaInstalled = isStandalone || isInstalled || false;
    return this.pwaInstalled;
  }

  reset(): void {
    this.platform = null;
    this.pwaInstalled = null;
  }
}

export const platformDetector = PlatformDetector.getInstance();

