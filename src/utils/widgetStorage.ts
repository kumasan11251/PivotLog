/**
 * ウィジェット用ストレージユーティリティ
 * React Native アプリからウィジェットデータを保存・読み込み
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import type { WidgetData, WidgetSettings } from '../types/widget';
import { DEFAULT_WIDGET_SETTINGS } from '../types/widget';
import { loadUserSettings } from './storage';
import { calculateLifeProgress, calculateCurrentAge, calculateTimeLeft } from './timeCalculations';

const WIDGET_SETTINGS_KEY = '@pivot_log_widget_settings';

/**
 * ウィジェット設定を保存
 */
export const saveWidgetSettings = async (settings: WidgetSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
    // ウィジェットデータも更新
    await syncWidgetData();
  } catch (error) {
    console.error('ウィジェット設定の保存に失敗:', error);
    throw error;
  }
};

/**
 * ウィジェット設定を読み込み
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

    return {
      birthday: userSettings.birthday,
      targetLifespan: userSettings.targetLifespan,
      lifeProgress,
      remainingYears: timeLeft.totalYears,
      remainingDays: Math.floor(timeLeft.totalDays),
      currentAge,
      customText: widgetSettings.customText,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('ウィジェットデータの生成に失敗:', error);
    return null;
  }
};

/**
 * ウィジェットデータをネイティブ側に同期
 * iOS: App Groups UserDefaults
 * Android: SharedPreferences
 */
export const syncWidgetData = async (): Promise<boolean> => {
  try {
    const widgetData = await generateWidgetData();
    if (!widgetData) {
      console.log('ウィジェットデータが生成できませんでした');
      return false;
    }

    // ネイティブモジュールが利用可能かチェック
    const { WidgetBridge } = NativeModules;

    if (WidgetBridge && typeof WidgetBridge.updateWidgetData === 'function') {
      await WidgetBridge.updateWidgetData(widgetData);
      console.log('ウィジェットデータを同期しました:', widgetData.lastUpdated);
      return true;
    } else {
      // ネイティブモジュールが未実装の場合はログのみ
      console.log('WidgetBridge が利用できません（ネイティブ実装が必要）');
      console.log('同期予定のデータ:', JSON.stringify(widgetData, null, 2));
      return false;
    }
  } catch (error) {
    console.error('ウィジェットデータの同期に失敗:', error);
    return false;
  }
};

/**
 * ウィジェットをリロード（更新通知）
 */
export const reloadWidgets = async (): Promise<void> => {
  try {
    const { WidgetBridge } = NativeModules;

    if (WidgetBridge && typeof WidgetBridge.reloadAllWidgets === 'function') {
      await WidgetBridge.reloadAllWidgets();
      console.log('ウィジェットをリロードしました');
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
