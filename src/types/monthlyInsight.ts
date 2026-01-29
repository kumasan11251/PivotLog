/**
 * 月次インサイト関連の型定義
 *
 * 月間インサイトは週間インサイトと明確に差別化された構造を持つ：
 * - 人生の中のこの月（Life Context）
 * - 月のストーリーライン（Narrative Arc）
 * - 価値観の発見（Value Discovery）
 * - 未来の自分への手紙（Letter to Future Self）
 */

/**
 * ストーリーラインのムード
 */
export type StorylineMood = 'busy' | 'peaceful' | 'challenging' | 'growing' | 'joyful' | 'reflective';

/**
 * ストーリーラインの各フェーズ
 */
export interface StorylinePhase {
  /** 期間の説明（例：「月初（1〜8日）」） */
  period: string;
  /** この時期の要約（30-50文字） */
  summary: string;
  /** この時期を象徴する日記の引用 */
  keyQuote?: string;
  /** この時期の全体的なムード */
  mood: StorylineMood;
}

/**
 * 月のストーリーライン（月初・月中・月末の3時期）
 */
export interface MonthlyStoryline {
  /** 月初（1-10日頃） */
  beginning: StorylinePhase;
  /** 月中（11-20日頃） */
  middle: StorylinePhase;
  /** 月末（21日-月末） */
  end: StorylinePhase;
}

/**
 * 主要な価値観
 */
export interface PrimaryValue {
  /** 価値観の名前（例：「家族との繋がり」） */
  name: string;
  /** この価値観を示す日記の引用（2-3個） */
  evidence: string[];
  /** この価値観についてのAIの洞察（50-80文字） */
  insight: string;
}

/**
 * 副次的な価値観
 */
export interface SecondaryValue {
  /** 価値観の名前 */
  name: string;
  /** 簡潔な根拠（具体的な引用や傾向） */
  briefEvidence: string;
}

/**
 * 価値観の発見
 */
export interface ValueDiscovery {
  /** 最も強く現れた価値観 */
  primaryValue: PrimaryValue;
  /** 2番目以降の価値観（2-3個） */
  secondaryValues: SecondaryValue[];
  /** ユーザーが気づいていなさそうな発見（80-120文字） */
  hiddenInsight: string;
}

/**
 * 月次インサイトのデータ構造（新構造）
 * 注意：既存データとの後方互換性のため、新フィールドはオプショナル
 */
export interface MonthlyInsightData {
  /** 月の開始日 (YYYY-MM-DD) */
  monthStartDate: string;
  /** 月の終了日 (YYYY-MM-DD) */
  monthEndDate: string;
  /** この月の日記記録数 */
  entryCount: number;

  // ========== 新セクション（オプショナル：既存データとの互換性） ==========

  /** セクション1: 人生の中のこの月（150-200文字） */
  lifeContextSummary?: string;

  /** セクション2: 月のストーリーライン */
  storyline?: MonthlyStoryline;

  /** セクション3: 価値観の発見 */
  valueDiscovery?: ValueDiscovery;

  /** セクション4: 変化のハイライト（2-4個） */
  highlights: MonthlyHighlight[];

  /** セクション5: 未来の自分への手紙（200-300文字） */
  letterToFutureSelf?: string;

  /** セクション6: 成長と課題 */
  growth: MonthlyGrowth;

  /** セクション7: 次の月への問いかけ（60-100文字） */
  question: string;

  // ========== メタ情報 ==========

  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン */
  modelVersion?: string;

  // ========== 後方互換性（旧フィールド） ==========

  /** @deprecated lifeContextSummaryを使用してください */
  summary?: string;
  /** @deprecated valueDiscoveryを使用してください */
  themes?: MonthlyTheme[];
}

/**
 * 月間ハイライト（特に印象的な出来事）
 */
export interface MonthlyHighlight {
  /** 日付 (YYYY-MM-DD) */
  date: string;
  /** ハイライトの種類 */
  type: 'achievement' | 'connection' | 'discovery' | 'turning_point';
  /** タイトル（15-25文字、詩的に） */
  title: string;
  /** 説明（50-80文字） */
  description: string;
  /** 日記からの引用 */
  quote?: string;
}

/**
 * 月間テーマの種類（後方互換性のため残す）
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
 * 月間テーマ（後方互換性のため残す）
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
  /** 成長したポイント（2-3個、各30-50文字） */
  improvements: string[];
  /** 次の月に向けた課題（2-3個、各30-50文字） */
  challenges: string[];
  /** 月初と月末の変化（50-80文字） */
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
