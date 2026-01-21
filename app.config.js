/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// .envファイルを読み込む
const envPath = path.resolve(__dirname, '.env');
const env = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  expo: {
    name: 'pivot-log',
    slug: 'pivot-log',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kumasan11251.pivotlog',
      googleServicesFile: './GoogleService-Info.plist',
      usesAppleSignIn: true,
      infoPlist: {
        CFBundleDevelopmentRegion: 'ja',
        CFBundleLocalizations: ['ja', 'en'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.kumasan11251.pivotlog',
      googleServicesFile: './google-services.json',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      '@react-native-firebase/app',
      '@react-native-google-signin/google-signin',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
    extra: {
      geminiApiKey: env.GEMINI_API_KEY || '',
      eas: {
        projectId: '41c32323-fec2-4cb3-bed7-afd879da5ea4',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/41c32323-fec2-4cb3-bed7-afd879da5ea4',
    },
  },
};
