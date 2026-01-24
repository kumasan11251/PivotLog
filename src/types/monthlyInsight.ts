/**
 * 月次インサイト関連の型定義
 */

/**
 * 月次インサイトのデータ構造
 */
export interface MonthlyInsightData {
  /** 月の開始日 (YYYY-MM-DD) */
  monthStartDate: string;
  /** 月の終了日 (YYYY-MM-DD) */
  monthEndDate: string;
  /** この月の日記記録数 */
  entryCount: number;
  /** AIによる月全体のサマリー */
  summary: string;
  /** 月間のハイライト（特に印象的な出来事） */
  highlights: MonthlyHighlight[];
  /** 発見されたテーマ・傾向（週次より大きな視点） */
  themes: MonthlyTheme[];
  /** 月間の成長・変化 */
  growth: MonthlyGrowth;
  /** 来月への問いかけ */
  question: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン */
  modelVersion?: string;
}

/**
 * 月間ハイライト（特に印象的な出来事）
 */
export interface MonthlyHighlight {
  /** 日付 (YYYY-MM-DD) */
  date: string;
  /** ハイライトの種類 */
  type: 'achievement' | 'connection' | 'discovery' | 'turning_point';
  /** タイトル */
  title: string;
  /** 説明 */
  description: string;
  /** 日記からの引用 */
  quote?: string;
}

/**
 * 月間テーマの種類
 */
export type MonthlyThemeType =
  | 'recurring_joy'      // 繰り返し現れる喜び
  | 'persistent_challenge' // 継続的な課題
  | 'evolving_priority'  // 変化する優先順位
  | 'relationship_pattern' // 人間関係のパターン
  | 'self_discovery'     // 自己発見
  | 'time_investment'    // 時間の投資先
  | 'value_alignment';   // 価値観との整合性

/**
 * 月間テーマ
 */
export interface MonthlyTheme {
  /** テーマの種類 */
  type: MonthlyThemeType;
  /** テーマのタイトル */
  title: string;
  /** テーマの詳細説明 */
  description: string;
  /** 週ごとの変化（オプション） */
  weeklyTrend?: {
    week: number;
    summary: string;
  }[];
  /** 関連する具体例 */
  examples?: {
    date: string;
    quote: string;
  }[];
}

/**
 * 月間の成長・変化
 */
export interface MonthlyGrowth {
  /** 成長したポイント */
  improvements: string[];
  /** 来月に向けた課題 */
  challenges: string[];
  /** 月初と月末の変化（意識や行動の変化） */
  transformation?: string;
}

/**
 * 月次インサイトの状態
 */
export type MonthlyInsightState = 'idle' | 'loading' | 'loaded' | 'error' | 'insufficient_data';

/**
 * 月次インサイト生成リクエスト
 */
export interface GenerateMonthlyInsightRequest {
  /** 月の日記エントリー */
  entries: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
  /** ユーザーの現在の年齢 */
  currentAge: number;
  /** 目標寿命までの残り年数 */
  remainingYears: number;
  /** 残り日数 */
  remainingDays: number;
  /** 月の開始日 */
  monthStartDate: string;
  /** 月の終了日 */
  monthEndDate: string;
  /** 対象年月 (YYYY-MM形式) */
  yearMonth: string;
}

/**
 * 月を識別するためのキー（YYYY-MM形式、例: 2026-01）
 */
export type MonthKey = string;

/**
 * 月次インサイトのキャッシュ
 */
export interface MonthlyInsightCache {
  [monthKey: MonthKey]: MonthlyInsightData;
}
