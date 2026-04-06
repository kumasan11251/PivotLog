import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

export const REVENUECAT_API_KEY = Platform.select({
  ios: extra?.revenueCatApiKeyIos ?? '',
  android: extra?.revenueCatApiKeyAndroid ?? '',
}) ?? '';

if (__DEV__) {
  console.log('[RevenueCat Config]', {
    platform: Platform.OS,
    hasApiKey: !!REVENUECAT_API_KEY,
    extraKeys: extra ? Object.keys(extra) : 'extra is undefined',
  });
}

export const ENTITLEMENT_ID = 'Premium';
