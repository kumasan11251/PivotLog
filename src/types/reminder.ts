/**
 * リマインダー通知に関する型定義
 */

// リマインダー設定
export interface ReminderSettings {
  enabled: boolean; // リマインダー有効/無効
  hour: number; // 通知時刻（時）: 0-23
  minute: number; // 通知時刻（分）: 0-59
}

// デフォルトのリマインダー設定
export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 21, // デフォルト: 21:00（夜の振り返りに最適）
  minute: 0,
};

// 通知メッセージの型
export interface NotificationMessage {
  title: string;
  body: string;
}

// 通知の種類
export type NotificationType =
  | 'daily_reminder' // 毎日のリマインダー
  | 'streak_reminder' // ストリーク維持のリマインダー
  | 'comeback_reminder'; // 復帰促進のリマインダー
