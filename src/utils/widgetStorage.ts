/**
 * ウィジェット用ストレージユーティリティ
 * React Native アプリからウィジェットデータを保存・読み込み
 * @bacons/apple-targets の ExtensionStorage を使用
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules, Appearance } from 'react-native';
import type { WidgetData, WidgetSettings } from '../types/widget';
import { DEFAULT_WIDGET_SETTINGS } from '../types/widget';
import { loadUserSettings, loadThemeSettings } from './storage';
import { calculateLifeProgress, calculateCurrentAge, calculateTimeLeft } from './timeCalculations';
import { getCurrentUser } from '../services/firebase/auth';
import {
  saveWidgetSettingsToFirestore,
  loadWidgetSettingsFromFirestore,
} from '../services/firebase/firestore';

// @bacons/apple-targets モジュールを動的にインポート
let ExtensionStorage: {
  new (groupId: string): {
    set: (key: string, value: string | number | Record<string, string | number> | undefined) => void;
    get: (key: string) => string | null;
    remove: (key: string) => void;
  };
  reloadWidget: (name?: string) => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appleTargets = require('@bacons/apple-targets');
  ExtensionStorage = appleTargets.ExtensionStorage;
} catch {
  console.log('[widgetStorage] @bacons/apple-targets module not available');
}

// Android用のExpoWidgetsモジュール
// Android用のWidgetBridgeモジュール（React Native NativeModules経由）
let WidgetBridge: {
  setWidgetData: (json: string, packageName: string) => Promise<boolean>;
} | null = null;

if (Platform.OS === 'android' && NativeModules.WidgetBridge) {
  WidgetBridge = NativeModules.WidgetBridge;
  console.log('[widgetStorage] WidgetBridge module loaded successfully');
} else if (Platform.OS === 'android') {
  console.log('[widgetStorage] WidgetBridge module not available');
}

// App Group ID
const APP_GROUP_ID = 'group.com.kumasan11251.pivotlog.expowidgets';
// Android package name
const ANDROID_PACKAGE_NAME = 'com.kumasan11251.pivotlog';

const WIDGET_SETTINGS_KEY = '@pivot_log_widget_settings';

/**
 * ウィジェット設定を保存（ローカル + クラウド同期）
 */
export const saveWidgetSettings = async (settings: WidgetSettings): Promise<void> => {
  try {
    // ローカルストレージに保存
    await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));

    // ログインしている場合はFirestoreにも同期
    const user = getCurrentUser();
    if (user) {
      try {
        await saveWidgetSettingsToFirestore({
          customText: settings.customText,
        });
        console.log('[widgetStorage] ウィジェット設定をFirestoreに同期しました');
      } catch (firestoreError) {
        console.error('[widgetStorage] Firestore同期エラー:', firestoreError);
        // ローカル保存は成功しているので、エラーは投げない
      }
    }

    // ウィジェットデータも更新
    await syncWidgetData();
  } catch (error) {
    console.error('ウィジェット設定の保存に失敗:', error);
    throw error;
  }
};

/**
 * ウィジェット設定を読み込み（クラウドからローカルへの同期を含む）
 */
export const loadWidgetSettings = async (): Promise<WidgetSettings> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_SETTINGS_KEY);
    if (data) {
      return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_WIDGET_SETTINGS;
  } catch (error) {
    console.error('ウィジェット設定の読み込みに失敗:', error);
    return DEFAULT_WIDGET_SETTINGS;
  }
};

/**
 * Firestoreからウィジェット設定を同期（ログイン時に呼び出す）
 */
export const syncWidgetSettingsFromCloud = async (): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.log('[widgetStorage] ユーザーがログインしていないため同期をスキップ');
      return;
    }

    const cloudSettings = await loadWidgetSettingsFromFirestore();
    if (cloudSettings && cloudSettings.customText !== undefined) {
      // クラウドの設定をローカルに保存
      const settings: WidgetSettings = {
        customText: cloudSettings.customText,
      };
      await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
      console.log('[widgetStorage] クラウドからウィジェット設定を同期しました');

      // ウィジェットデータも更新
      await syncWidgetData();
    }
  } catch (error) {
    console.error('[widgetStorage] クラウド同期エラー:', error);
  }
};

/**
 * ウィジェットデータを計算して生成
 */
export const generateWidgetData = async (): Promise<WidgetData | null> => {
  try {
    const userSettings = await loadUserSettings();
    if (!userSettings) {
      return null;
    }

    const widgetSettings = await loadWidgetSettings();
    const timeLeft = calculateTimeLeft(userSettings.birthday, userSettings.targetLifespan);
    const lifeProgress = calculateLifeProgress(userSettings.birthday, userSettings.targetLifespan);
    const currentAge = calculateCurrentAge(userSettings.birthday);

    // テーマ設定を取得してカラースキームを決定
    const themeSettings = await loadThemeSettings();
    let colorScheme: 'light' | 'dark' = 'light';
    if (themeSettings?.themeMode === 'dark') {
      colorScheme = 'dark';
    } else if (themeSettings?.themeMode === 'light') {
      colorScheme = 'light';
    } else {
      // system の場合はデバイスの設定に従う
      const systemColorScheme = Appearance.getColorScheme();
      colorScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
    }

    return {
      birthday: userSettings.birthday,
      targetLifespan: userSettings.targetLifespan,
      lifeProgress,
      remainingYears: timeLeft.totalYears,
      remainingDays: Math.floor(timeLeft.totalDays),
      currentAge,
      customText: widgetSettings.customText,
      showProgress: true,        // 常に表示
      showRemainingTime: true,   // 常に表示
      showCustomText: true,      // 常に表示
      colorScheme,               // テーマ設定
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('ウィジェットデータの生成に失敗:', error);
    return null;
  }
};

/**
 * ウィジェットデータをネイティブ側に同期
 * iOS: @bacons/apple-targets の ExtensionStorage を使用 (App Groups UserDefaults)
 * Android: ExpoWidgets モジュールを使用 (SharedPreferences)
 */
export const syncWidgetData = async (): Promise<boolean> => {
  try {
    const widgetData = await generateWidgetData();
    if (!widgetData) {
      console.log('[widgetStorage] ウィジェットデータが生成できませんでした');
      return false;
    }

    const jsonData = JSON.stringify(widgetData);

    if (Platform.OS === 'ios') {
      // iOS: @bacons/apple-targets の ExtensionStorage を使用
      if (!ExtensionStorage) {
        console.log('[widgetStorage] @bacons/apple-targets モジュールが利用できません');
        console.log('[widgetStorage] 同期予定のデータ:', jsonData);
        return false;
      }

      const storage = new ExtensionStorage(APP_GROUP_ID);
      storage.set('widgetData', jsonData);

      // ウィジェットをリロード
      ExtensionStorage.reloadWidget();

      console.log('[widgetStorage] iOSウィジェットデータを同期しました');
      return true;
    } else if (Platform.OS === 'android') {
      // Android: WidgetBridge モジュールを使用
      if (!WidgetBridge) {
        console.log('[widgetStorage] WidgetBridge モジュールが利用できません');
        console.log('[widgetStorage] 同期予定のデータ:', jsonData);
        return false;
      }

      try {
        await WidgetBridge.setWidgetData(jsonData, ANDROID_PACKAGE_NAME);
        console.log('[widgetStorage] Androidウィジェットデータを同期しました');
        return true;
      } catch (androidError) {
        console.error('[widgetStorage] Android同期エラー:', androidError);
        return false;
      }
    }

    console.log('[widgetStorage] 未対応のプラットフォーム:', Platform.OS);
    return false;
  } catch (error) {
    console.error('[widgetStorage] ウィジェットデータの同期に失敗:', error);
    return false;
  }
};

/**
 * ウィジェットをリロード（更新通知）
 */
export const reloadWidgets = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios' && ExtensionStorage) {
      ExtensionStorage.reloadWidget();
      console.log('ウィジェットをリロードしました');
    } else {
      // syncWidgetData を呼ぶことでウィジェットが自動的に更新される
      await syncWidgetData();
    }
  } catch (error) {
    console.error('ウィジェットのリロードに失敗:', error);
  }
};

/**
 * プラットフォーム情報を取得
 */
export const getWidgetPlatformInfo = (): {
  platform: string;
  supportsWidgets: boolean;
  minOSVersion: string;
} => {
  if (Platform.OS === 'ios') {
    return {
      platform: 'ios',
      supportsWidgets: true,
      minOSVersion: '14.0', // WidgetKit requires iOS 14+
    };
  } else if (Platform.OS === 'android') {
    return {
      platform: 'android',
      supportsWidgets: true,
      minOSVersion: '5.0', // App Widgets supported since Android 5.0
    };
  }
  return {
    platform: Platform.OS,
    supportsWidgets: false,
    minOSVersion: 'N/A',
  };
};
