import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.koirela.app',
  appName: 'KoiRela',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
