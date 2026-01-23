/**
 * 週次インサイト関連の型定義
 */

/**
 * 週次インサイトのデータ構造
 */
export interface WeeklyInsightData {
  /** 週の開始日 (YYYY-MM-DD) */
  weekStartDate: string;
  /** 週の終了日 (YYYY-MM-DD) */
  weekEndDate: string;
  /** この週の日記記録数 */
  entryCount: number;
  /** AIによる分析サマリー */
  summary: string;
  /** 発見されたパターン・傾向 */
  patterns: InsightPattern[];
  /** AIからの問いかけ */
  question: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン */
  modelVersion?: string;
}

/**
 * インサイトパターンの種類
 */
export type InsightPatternType =
  | 'positive_theme'    // ポジティブなテーマ（良かったことの傾向）
  | 'growth_area'       // 成長の機会（後悔から見える改善点）
  | 'time_awareness'    // 時間の使い方への気づき
  | 'relationship'      // 人間関係に関する気づき
  | 'self_care'         // セルフケアに関する気づき
  | 'work_life'         // 仕事・ライフバランス
  | 'intention_action'; // 意図と行動の関係

/**
 * 分析で発見されたパターン
 */
export interface InsightPattern {
  /** パターンの種類 */
  type: InsightPatternType;
  /** パターンのタイトル（短い説明） */
  title: string;
  /** パターンの詳細説明 */
  description: string;
  /** 関連する日記からの引用（日付付き） */
  examples?: Array<{
    date: string;
    quote: string;
  }>;
  /** 出現回数 */
  frequency?: number;
}

/**
 * 週次インサイトの状態
 */
export type WeeklyInsightState = 'idle' | 'loading' | 'loaded' | 'error' | 'insufficient_data';

/**
 * 週次インサイト生成リクエスト
 */
export interface GenerateWeeklyInsightRequest {
  /** 週の日記エントリー */
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
  /** 週の開始日 */
  weekStartDate: string;
  /** 週の終了日 */
  weekEndDate: string;
}

/**
 * 週を識別するためのキー（YYYY-Www形式、例: 2026-W04）
 */
export type WeekKey = string;

/**
 * 週次インサイトのキャッシュ
 */
export interface WeeklyInsightCache {
  [weekKey: WeekKey]: WeeklyInsightData;
}
