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
    name: 'PivotLog',
    slug: 'pivot-log',
    scheme: 'pivotlog',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
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
      appleTeamId: '4823HQK9AB',
      // src/constants/legal.ts の LEGAL_URLS.PRIVACY と同期すること
      privacyUrl: 'https://kumasan11251.github.io/PivotLog/privacy',
      entitlements: {
        'com.apple.security.application-groups': [
          'group.com.kumasan11251.pivotlog.expowidgets',
        ],
      },
      infoPlist: {
        CFBundleDevelopmentRegion: 'ja',
        CFBundleLocalizations: ['ja', 'en'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#8B9D83',
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
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.882479887406-e4u4v0e8e63lepdlgcc5oqa0jcc7sh7v',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
      '@bacons/apple-targets',
      './plugins/withAndroidWidget',
      [
        'expo-notifications',
        {
          sounds: [],
        },
      ],
    ],
    extra: {
      geminiApiKey: env.GEMINI_API_KEY || '',
      revenueCatApiKeyIos: env.REVENUECAT_API_KEY_IOS || process.env.REVENUECAT_API_KEY_IOS || '',
      revenueCatApiKeyAndroid: env.REVENUECAT_API_KEY_ANDROID || process.env.REVENUECAT_API_KEY_ANDROID || '',
      eas: {
        projectId: '41c32323-fec2-4cb3-bed7-afd879da5ea4',
      },
    },
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/41c32323-fec2-4cb3-bed7-afd879da5ea4',
    },
  },
};
