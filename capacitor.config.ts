import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bepnha.app',
  appName: 'Bếp Nhà',
  webDir: 'public',
  server: {
    url: 'https://bep-nha-nextjs.vercel.app',
    cleartext: true
  }
};

export default config;