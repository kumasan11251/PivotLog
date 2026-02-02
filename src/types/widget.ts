/**
 * ウィジェット関連の型定義
 */

/**
 * ウィジェットで共有するデータ構造
 * React Native アプリとネイティブウィジェット間で共有される
 */
export interface WidgetData {
  // 基本情報
  birthday: string;           // ISO 8601 format (YYYY-MM-DD)
  targetLifespan: number;     // 目標寿命（年）

  // 計算済みデータ（ウィジェット側の計算負荷を軽減）
  lifeProgress: number;       // 人生の進捗率（0〜100）
  remainingYears: number;     // 残り年数（小数点以下含む）
  remainingDays: number;      // 残り日数
  currentAge: number;         // 現在の年齢（小数点以下含む）

  // カスタムテキスト（ウィジェット設定画面で入力）
  customText: string;         // ユーザーが設定したテキスト

  // 表示設定
  showProgress: boolean;      // 進捗を表示するか
  showRemainingTime: boolean; // 残り時間を表示するか
  showCustomText: boolean;    // カスタムテキストを表示するか

  // テーマ設定
  colorScheme: 'light' | 'dark';  // アプリで設定されたテーマ（light/dark）

  // メタデータ
  lastUpdated: string;        // 最終更新日時 ISO 8601
}

/**
 * ウィジェット設定
 * ユーザーが設定画面で入力するデータ
 */
export interface WidgetSettings {
  // カスタムテキスト
  customText: string;
}

/**
 * デフォルトのウィジェット設定
 */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  customText: '',
};

/**
 * ウィジェットの種類
 */
export type WidgetType = 'progress' | 'text' | 'combined';

/**
 * ウィジェットサイズ（プラットフォーム共通）
 */
export type WidgetSize = 'small' | 'medium' | 'large';
