import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

export const REVENUECAT_API_KEY = Platform.select({
  ios: extra?.revenueCatApiKeyIos ?? '',
  android: extra?.revenueCatApiKeyAndroid ?? '',
}) ?? '';

export const ENTITLEMENT_ID = 'premium';
