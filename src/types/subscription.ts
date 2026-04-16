/**
 * サブスクリプション関連の型定義
 *
 * 課金ユーザーと無課金ユーザーの機能差を管理するための型
 */

/**
 * サブスクリプションのティア（階層）
 */
export type SubscriptionTier = 'free' | 'premium';

/**
 * サブスクリプションの状態
 */
export interface SubscriptionStatus {
  /** 現在のティア */
  tier: SubscriptionTier;
  /** プレミアムかどうか */
  isPremium: boolean;
  /** サブスクリプションの有効期限（ISO 8601） */
  expiresAt?: string;
  /** 自動更新が有効か */
  isAutoRenewEnabled?: boolean;
  /** 購入元プラットフォーム */
  platform?: 'ios' | 'android';
  /** 最終更新日時 */
  updatedAt?: string;
}

/**
 * AI機能の利用制限設定
 */
export interface AIUsageLimits {
  /** 無料ユーザーの月間リフレクション生成上限 */
  freeMonthlyReflectionLimit: number;
  /** プレミアムユーザーの1日あたりの生成上限 */
  premiumDailyLimit: number;
  /** 無料ユーザーの週次インサイト生成上限（0=利用不可） */
  freeWeeklyInsightLimit: number;
  /** 無料ユーザーの月次インサイト生成上限（0=利用不可） */
  freeMonthlyInsightLimit: number;
}

/**
 * デフォルトの利用制限設定
 */
export const DEFAULT_AI_USAGE_LIMITS: AIUsageLimits = {
  freeMonthlyReflectionLimit: 3,
  premiumDailyLimit: 30,
  freeWeeklyInsightLimit: 1,
  freeMonthlyInsightLimit: 0,
};

/**
 * AIリフレクションの利用状況
 */
export interface AIReflectionUsage {
  /** 月次利用状況（YYYY-MM形式をキーとする） */
  monthlyUsage: {
    [yearMonth: string]: MonthlyUsageRecord;
  };
  /** 日記ごとの生成履歴 */
  reflectionHistory: {
    [diaryDate: string]: DiaryReflectionRecord;
  };
  /** 日次利用状況（YYYY-MM-DD形式をキーとする） */
  dailyUsage?: {
    [date: string]: number;
  };
  /** 最終更新日時 */
  updatedAt: string;
}

/**
 * 月次利用記録
 */
export interface MonthlyUsageRecord {
  /** その月の生成回数 */
  count: number;
  /** 最終生成日時 */
  lastGeneratedAt: string;
}

/**
 * 日記ごとのリフレクション生成記録
 */
export interface DiaryReflectionRecord {
  /** 初回生成日時 */
  generatedAt: string;
  /** 再生成回数（初回は0、再生成するごとに+1） */
  regenerateCount: number;
  /** 最終再生成日時 */
  lastRegeneratedAt?: string;
}

/**
 * 週次インサイトの利用状況
 */
export interface WeeklyInsightUsage {
  /** 月次利用状況（YYYY-MM形式をキーとする） */
  monthlyUsage: { [yearMonth: string]: MonthlyUsageRecord };
  /** 週ごとの生成履歴（YYYY-WNN形式をキーとする） */
  generationHistory: { [weekKey: string]: { generatedAt: string } };
  /** 最終更新日時 */
  updatedAt: string;
}

/**
 * 利用制限のチェック結果
 */
export interface UsageLimitCheckResult {
  /** 生成可能かどうか */
  canGenerate: boolean;
  /** 制限に達している場合の理由 */
  limitReason?: UsageLimitReason;
  /** 今月の残り回数（無制限の場合はnull） */
  remainingThisMonth: number | null;
  /** この日記の残り再生成回数（無制限の場合はnull） */
  remainingRegenerations: number | null;
  /** 今月の利用回数 */
  usedThisMonth: number;
  /** この日記の再生成回数 */
  regenerationsUsed: number;
}

/**
 * 利用制限の理由コード
 */
export type UsageLimitReason =
  | 'MONTHLY_LIMIT_REACHED'      // 月間制限に達した
  | 'REGENERATE_NOT_ALLOWED'    // 無料プランでは再生成不可
  | 'DAILY_LIMIT_REACHED';      // 1日の利用上限に達した

/** 購入復元の結果 */
export type RestoreResult = 'restored' | 'not_found' | 'unavailable' | 'transfer_blocked';

/** パッケージ購入の結果 */
export type PurchaseResult = 'purchased' | 'cancelled' | 'pending' | 'restored';

/**
 * AI生成失敗系エラーコード
 */
export type GenerationErrorCode =
  | 'MODEL_OUTPUT_TRUNCATED'    // MAX_TOKENSによる出力切り詰め
  | 'MODEL_SAFETY_BLOCKED'      // SAFETYフィルタによるブロック
  | 'AI_GENERATION_FAILED';     // その他の生成失敗（パースエラー等）

/**
 * Cloud Functions のエラーレスポンス詳細
 */
export interface UsageLimitErrorDetails {
  code: UsageLimitReason;
  remaining?: number;
  limit?: number;
  tier?: SubscriptionTier;
}
