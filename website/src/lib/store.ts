export type StorePlatform = 'ios' | 'android';

export const STORE_URLS = {
  ios: 'https://apps.apple.com/jp/app/id6760384852',
  android: 'https://play.google.com/store/apps/details?id=com.kumasan11251.pivotlog',
} as const satisfies Record<StorePlatform, string>;

export const STORE_QR_IMAGES = {
  ios: '/images/store/qr-app-store.png',
  android: '/images/store/qr-google-play.png',
} as const satisfies Record<StorePlatform, string>;

export const STORE_LABELS = {
  ios: {
    eyebrow: 'Download on the',
    name: 'App Store',
    aria: 'App StoreでPivotLogを開く',
    qrAlt: 'App StoreでPivotLogを開くQRコード',
  },
  android: {
    eyebrow: 'GET IT ON',
    name: 'Google Play',
    aria: 'Google PlayでPivotLogを開く',
    qrAlt: 'Google PlayでPivotLogを開くQRコード',
  },
} as const satisfies Record<StorePlatform, { eyebrow: string; name: string; aria: string; qrAlt: string }>;
