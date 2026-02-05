/**
 * ウィジェット関連の型定義
 */

/**
 * メッセージ表示ソースの種類
 */
export type MessageSource = 'custom' | 'perspective' | 'daily';

/**
 * カウントダウン表示モード
 */
export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';

/**
 * ウィジェット用カウントダウンモード
 * ※ 以前は 'syncWithHome' オプションがあったが、ホーム画面との表示形式の違いで
 *   混乱を招くため削除。既存ユーザーのフォールバックは widgetStorage.ts で処理。
 */
export type WidgetCountdownMode = CountdownMode;

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

  // --- 以下、拡張フィールド（全てオプショナルで後方互換性維持） ---

  // 日替わりコンテンツ
  perspectiveEmoji?: string;       // 視点メッセージ絵文字
  perspectiveMainText?: string;    // メインテキスト（プレースホルダー展開済み）
  perspectiveSubtext?: string;     // サブテキスト
  dailyMessage?: string;           // DAILY_MESSAGESからの温かいメッセージ
  messageSource?: MessageSource;   // メッセージ表示ソース設定

  // 日記・記録
  hasTodayEntry?: boolean;         // 今日の日記記入済みか
  streakDays?: number;             // 連続記録日数
  totalDays?: number;              // 総記録日数
  streakEmoji?: string;            // マイルストーン対応絵文字

  // 日付
  todayDateLabel?: string;         // "2月4日(火)" 形式

  // カウントダウンモード用
  countdownMode?: CountdownMode;   // 表示モード
  totalWeeks?: number;             // 残り週数

  // 表示設定フラグ
  showStreak?: boolean;            // 連続記録を表示するか
  showDiaryStatus?: boolean;       // 日記記入状態を表示するか
  showDateHeader?: boolean;        // 日付ヘッダーを表示するか
}

/**
 * ウィジェット設定
 * ユーザーが設定画面で入力するデータ
 */
export interface WidgetSettings {
  customText: string;
  messageSource: MessageSource;
  showStreak: boolean;
  showDiaryStatus: boolean;
  showDateHeader: boolean;
  countdownMode: WidgetCountdownMode;
}

/**
 * デフォルトのウィジェット設定
 */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  customText: '',
  messageSource: 'custom',
  showStreak: true,
  showDiaryStatus: true,
  showDateHeader: true,
  countdownMode: 'detailed',
};

/**
 * ウィジェットの種類
 */
export type WidgetType = 'progress' | 'text' | 'combined';

/**
 * ウィジェットサイズ（プラットフォーム共通）
 */
export type WidgetSize = 'small' | 'medium' | 'large';
