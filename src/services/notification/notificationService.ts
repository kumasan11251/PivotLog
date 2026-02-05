/**
 * 通知サービス
 * expo-notificationsを使用したローカル通知の管理
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReminderSettings, NotificationMessage } from '../../types/reminder';
import { DEFAULT_REMINDER_SETTINGS } from '../../types/reminder';
import { DAILY_REMINDER_MESSAGES, getMessageByDate } from './messages';

const REMINDER_SETTINGS_KEY = '@pivot_log_reminder_settings';
const DAILY_REMINDER_IDENTIFIER = 'daily-reminder';

// 通知のデフォルト設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 通知権限をリクエスト
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('通知はシミュレーターでは動作しません');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('通知の権限が許可されませんでした');
    return false;
  }

  // Android用のチャンネル設定
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B9D83',
    });
  }

  return true;
};

/**
 * 通知権限の状態を確認
 */
export const checkNotificationPermissions = async (): Promise<boolean> => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * リマインダー設定を保存
 */
export const saveReminderSettings = async (settings: ReminderSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('リマインダー設定の保存に失敗:', error);
    throw error;
  }
};

/**
 * リマインダー設定を読み込み
 */
export const loadReminderSettings = async (): Promise<ReminderSettings> => {
  try {
    const json = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
    if (json) {
      return JSON.parse(json) as ReminderSettings;
    }
    return DEFAULT_REMINDER_SETTINGS;
  } catch (error) {
    console.error('リマインダー設定の読み込みに失敗:', error);
    return DEFAULT_REMINDER_SETTINGS;
  }
};

/**
 * 毎日のリマインダー通知をスケジュール
 */
export const scheduleDailyReminder = async (
  hour: number,
  minute: number,
  message?: NotificationMessage
): Promise<string | null> => {
  try {
    // 既存のリマインダーをキャンセル
    await cancelDailyReminder();

    const notificationMessage = message || getMessageByDate(DAILY_REMINDER_MESSAGES);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationMessage.title,
        body: notificationMessage.body,
        data: { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
      identifier: DAILY_REMINDER_IDENTIFIER,
    });

    console.log(`リマインダーをスケジュール: ${hour}:${minute.toString().padStart(2, '0')}`);
    return identifier;
  } catch (error) {
    console.error('リマインダーのスケジュールに失敗:', error);
    return null;
  }
};

/**
 * 毎日のリマインダーをキャンセル
 */
export const cancelDailyReminder = async (): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_IDENTIFIER);
    console.log('リマインダーをキャンセルしました');
  } catch (error) {
    // 既存の通知がない場合はエラーを無視
    console.log('キャンセルする通知がありませんでした');
  }
};

/**
 * すべてのスケジュール済み通知をキャンセル
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * スケジュール済みの通知を取得
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  return await Notifications.getAllScheduledNotificationsAsync();
};

/**
 * リマインダーを有効化
 */
export const enableReminder = async (hour: number, minute: number): Promise<boolean> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return false;
  }

  const settings: ReminderSettings = {
    enabled: true,
    hour,
    minute,
  };

  await saveReminderSettings(settings);
  await scheduleDailyReminder(hour, minute);
  return true;
};

/**
 * リマインダーを無効化
 */
export const disableReminder = async (): Promise<void> => {
  const settings = await loadReminderSettings();
  settings.enabled = false;
  await saveReminderSettings(settings);
  await cancelDailyReminder();
};

/**
 * リマインダー設定を更新してスケジュールし直す
 */
export const updateReminderSchedule = async (settings: ReminderSettings): Promise<void> => {
  await saveReminderSettings(settings);

  if (settings.enabled) {
    const hasPermission = await checkNotificationPermissions();
    if (hasPermission) {
      await scheduleDailyReminder(settings.hour, settings.minute);
    }
  } else {
    await cancelDailyReminder();
  }
};

/**
 * アプリ起動時にリマインダーを再スケジュール
 * （アプリ再インストール後などに必要）
 */
export const initializeReminder = async (): Promise<void> => {
  const settings = await loadReminderSettings();

  if (settings.enabled) {
    const hasPermission = await checkNotificationPermissions();
    if (hasPermission) {
      await scheduleDailyReminder(settings.hour, settings.minute);
    }
  }
};

/**
 * テスト用：即座に通知を送信
 */
export const sendTestNotification = async (): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'PivotLog',
      body: 'テスト通知です。リマインダーが正常に動作しています。',
      data: { type: 'test' },
    },
    trigger: null, // 即座に送信
  });
};
