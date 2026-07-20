import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.klarpakke.app',
  appName: 'Klarpakke',
  webDir: 'out',
  server: {
    url: 'https://www.klarpakke.no',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    allowsLinkPreview: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B0F19',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
