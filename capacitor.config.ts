import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chaerori.travel',
  appName: '여행 일정',
  webDir: 'dist-ios',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
};

export default config;
