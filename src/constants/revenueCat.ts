import { Platform } from 'react-native';
import Constants from 'expo-constants';

const FALLBACK_API_KEY_IOS = 'appl_tyRwghfySgKjGWDeSnUaoyTvWEY';
const FALLBACK_API_KEY_ANDROID = 'goog_BgPtWfPjdttWiUTypfTsigXHoGd';

/**
 * RevenueCat APIキーを取得する関数
 * 呼び出しごとに Constants.expoConfig?.extra を再評価するため、
 * アプリ起動時にextraが未準備でもリトライ時に取得できる
 */
export function getRevenueCatApiKey(): string {
  const extra = Constants.expoConfig?.extra;
  const apiKey = Platform.select({
    ios: extra?.revenueCatApiKeyIos || FALLBACK_API_KEY_IOS,
    android: extra?.revenueCatApiKeyAndroid || FALLBACK_API_KEY_ANDROID,
  }) ?? '';

  console.log('[RevenueCat Config]', {
    platform: Platform.OS,
    hasApiKey: !!apiKey,
    extraKeys: extra ? Object.keys(extra) : 'extra is undefined',
  });

  return apiKey;
}

export const ENTITLEMENT_ID = 'Premium';
