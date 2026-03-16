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
const DAILY_REMINDER_BACKUP_PREFIX = 'pivot_log_reminder_backup_';
const BACKUP_DAYS = 7;

// 通知のデフォルト設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
        badge: 1,
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
    // バックアップ DATE trigger も全てキャンセル
    for (let i = 2; i <= BACKUP_DAYS; i++) {
      await Notifications.cancelScheduledNotificationAsync(
        `${DAILY_REMINDER_BACKUP_PREFIX}${i}`
      );
    }
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

  if (!settings.enabled) return;

  const hasPermission = await checkNotificationPermissions();
  if (!hasPermission) return;

  // 既存のスケジュール済み通知を確認
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingReminder = scheduled.find(
    (n) => n.identifier === DAILY_REMINDER_IDENTIFIER
  );

  // バックアップ DATE trigger の整理（早期リターンの前に実行）
  const backupIdentifiers = Array.from({ length: BACKUP_DAYS - 1 }, (_, i) =>
    `${DAILY_REMINDER_BACKUP_PREFIX}${i + 2}`
  );
  const existingBackups = scheduled.filter(
    (n) => backupIdentifiers.includes(n.identifier)
  );

  if (existingReminder) {
    // 既にスケジュール済み — ただし設定時刻が変更されていないか確認する
    const trigger = existingReminder.trigger;
    const isTimeChanged = (() => {
      if (trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY) {
        return trigger.hour !== settings.hour || trigger.minute !== settings.minute;
      }
      if (trigger.type === Notifications.SchedulableTriggerInputTypes.DATE) {
        const scheduledDate = new Date(trigger.date);
        return scheduledDate.getHours() !== settings.hour || scheduledDate.getMinutes() !== settings.minute;
      }
      return false;
    })();

    if (!isTimeChanged) {
      // 時刻が一致 → メインはそのまま維持
      // 時刻が不一致のバックアップのみキャンセル
      for (const backup of existingBackups) {
        const backupTrigger = backup.trigger;
        if (backupTrigger.type === Notifications.SchedulableTriggerInputTypes.DATE) {
          const backupDate = new Date(backupTrigger.date);
          if (backupDate.getHours() !== settings.hour || backupDate.getMinutes() !== settings.minute) {
            await Notifications.cancelScheduledNotificationAsync(backup.identifier);
          }
        }
      }
      return;
    }
    // 時刻が変更されている → 再スケジュールが必要（下に続く）
  }

  // バックアップ DATE trigger がある場合は全てキャンセル（メインの DAILY に統合するため）
  for (const backup of existingBackups) {
    await Notifications.cancelScheduledNotificationAsync(backup.identifier);
  }

  // スケジュールが存在しない or 時刻変更あり → DAILY で新規スケジュール
  await scheduleDailyReminder(settings.hour, settings.minute);
};

/**
 * 当日のリマインダーをキャンセルし、翌日から再スケジュール
 * 日記を書いた後に呼び出す
 */
export const cancelTodayReminderAndReschedule = async (): Promise<void> => {
  try {
    const settings = await loadReminderSettings();
    if (!settings.enabled) return;

    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) return;

    await cancelDailyReminder();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // リマインダー時刻がまだ来ていない場合は、翌日〜7日後まで DATE trigger でスケジュール
    const isBeforeReminderTime =
      currentHour < settings.hour ||
      (currentHour === settings.hour && currentMinute < settings.minute);

    if (isBeforeReminderTime) {
      // DATE trigger は1回限りのため、アプリを開かない期間をカバーするために
      // 7日分の DATE trigger を個別にスケジュールする
      for (let i = 1; i <= BACKUP_DAYS; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(settings.hour, settings.minute, 0, 0);

        const message = getMessageByDate(DAILY_REMINDER_MESSAGES);
        const identifier = i === 1
          ? DAILY_REMINDER_IDENTIFIER
          : `${DAILY_REMINDER_BACKUP_PREFIX}${i}`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            data: { type: 'daily_reminder' },
            badge: 1,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetDate,
          },
          identifier,
        });
      }

      console.log(`翌日〜${BACKUP_DAYS}日後の DATE trigger でリマインダーをスケジュール`);
    } else {
      // リマインダー時刻を過ぎている → 通常の DAILY で再スケジュール（翌日から発火）
      await scheduleDailyReminder(settings.hour, settings.minute);
    }
  } catch (error) {
    console.error('リマインダーの再スケジュールに失敗:', error);
  }
};

/**
 * アプリバッジ数を設定
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('バッジ設定に失敗:', error);
  }
};

/**
 * アプリバッジをクリア
 */
export const clearBadge = async (): Promise<void> => {
  await setBadgeCount(0);
};
