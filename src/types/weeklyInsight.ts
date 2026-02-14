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
  [weekKey: WeekKey]: WeeklyInsightData | WeeklyInsightDataV2;
}

// ============================================
// V2: 週間インサイト ブラッシュアップ版
// ============================================

/**
 * 達成した意図（想い→行動の繋がり）
 */
export interface AchievedIntention {
  /** 意図を書いた日 */
  intentionDate: string;
  /** 「明日大切にしたいこと」の内容 */
  intention: string;
  /** 実現した日 */
  achievedDate: string;
  /** 実現した内容（「良かったこと」から） */
  achievement: string;
}

/**
 * 想い→行動の追跡結果
 * ※スコアは表示しない、達成のみを祝福
 */
export interface IntentionToAction {
  /** 達成した意図のリスト */
  achieved: AchievedIntention[];
  /** なぜ達成できたかの分析（再現性を高める、80-100字） */
  successAnalysis: string;
  /** AIからの祝福コメント（50-80字） */
  celebration: string;
}

/**
 * 来週へのアクション提案（充実版）
 */
export interface WeeklyActionSuggestion {
  /** メイン提案 */
  mainSuggestion: {
    /** アクション内容 */
    action: string;
    /** なぜこのアクションが効果的か（50-80字） */
    reason: string;
    /** 具体的なタイミング（「水曜の夜に」など） */
    suggestedTiming: string;
  };
  /** 継続したいこと（この週で良かった習慣） */
  keepDoing?: string;
}

/**
 * パターン（充実版）
 */
export interface InsightPatternV2 {
  /** パターンの種類 */
  type: InsightPatternType;
  /** パターンのタイトル */
  title: string;
  /** パターンの説明（100-150字） */
  description: string;
  /** 具体的な引用2つ */
  examples: Array<{ date: string; quote: string }>;
  /** なぜこのパターンが生まれるかの深掘り */
  insight: string;
}

/**
 * 週次インサイトのデータ構造（V2）
 * 3セクション・各充実版
 */
export interface WeeklyInsightDataV2 {
  /** 週の開始日 (YYYY-MM-DD) */
  weekStartDate: string;
  /** 週の終了日 (YYYY-MM-DD) */
  weekEndDate: string;
  /** この週の日記記録数 */
  entryCount: number;

  /** セクション1: 想いを行動に変えた瞬間（達成が0件なら空配列） */
  intentionToAction: IntentionToAction;
  /** セクション2: 発見されたパターン（2個、各100-150字） */
  patterns: InsightPatternV2[];
  /** セクション3: 来週へのアクション（理由とタイミング付き） */
  actionSuggestion: WeeklyActionSuggestion;

  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン */
  modelVersion?: string;
  /** スキーマバージョン */
  schemaVersion: 2;
}

/**
 * V2インサイトかどうかを判定
 */
export function isWeeklyInsightV2(
  insight: WeeklyInsightData | WeeklyInsightDataV2
): insight is WeeklyInsightDataV2 {
  return 'schemaVersion' in insight && insight.schemaVersion === 2;
}
