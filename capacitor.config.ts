import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cinchef.app',
  appName: 'CinChef',
  webDir: 'www',
  server: {
    url: 'https://heycinchef-7lqs.vercel.app',
    cleartext: true,
  },
};

export default config;
