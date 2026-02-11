/**
 * AIリフレクション関連の型定義
 */

/**
 * 感情の洞察
 */
export interface EmotionInsight {
  /** 読み取った感情（「達成感」「焦り」「安らぎ」など） */
  detected: string;
  /** その感情の奥にあるもの */
  depth: string;
}

/**
 * 人生の文脈
 */
export interface LifeContext {
  /** 人生視点からの意味づけ */
  perspective: string;
}

/**
 * アクション提案
 */
export interface ActionSuggestion {
  /** 今日/明日できる小さなアクション（5分以内で実行可能） */
  micro: string;
  /** なぜそのアクションが意味を持つか */
  reason: string;
}

/**
 * 過去からの連続性（Phase 2で追加）
 */
export interface ContinuityInsight {
  /** 過去との繋がり */
  connectionToPast?: {
    /** 参照した日付（YYYY-MM-DD） */
    referenceDate: string;
    /** 繋がりの説明（50-80文字） */
    connection: string;
  };
  /** 成長の観察 */
  growthObservation?: {
    /** 成長の観察コメント（50-80文字） */
    observation: string;
  };
}

/**
 * AIリフレクションのデータ構造（V1: 旧フォーマット）
 * 後方互換性のため、新フィールドはオプショナル
 */
export interface AIReflectionDataV1 {
  /** AIからのメッセージ本文（共感メッセージ） */
  content: string;
  /** 問いかけ部分 */
  question: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン（デバッグ用） */
  modelVersion?: string;
  /** スキーマバージョン（V1は未定義または1） */
  schemaVersion?: 1;

  // === 拡張フィールド（Phase 1で追加） ===

  /** 感情の洞察 */
  emotionInsight?: EmotionInsight;
  /** 人生の文脈 */
  lifeContext?: LifeContext;
  /** アクション提案 */
  actionSuggestion?: ActionSuggestion;

  // === 拡張フィールド（Phase 2で追加） ===

  /** 過去からの連続性 */
  continuity?: ContinuityInsight;
}

/**
 * AIリフレクションのデータ構造（V2: 動的セクション）
 * 日記の内容に応じてAIが1〜3セクションを生成
 */
export interface AIReflectionDataV2 {
  /** 必須: 今日のあなたへ（感情の理解と共感） */
  understanding: string;
  /** 任意: 人生という視点で（深い日記や節目に） */
  perspective?: string;
  /** 任意: 明日へのヒント（アクション提案や問いかけ） */
  tomorrow?: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン（デバッグ用） */
  modelVersion?: string;
  /** スキーマバージョン（V2は2） */
  schemaVersion: 2;
}

/**
 * AIリフレクションのデータ構造（V1とV2の統合型）
 */
export type AIReflectionData = AIReflectionDataV1 | AIReflectionDataV2;

/**
 * V2フォーマットかどうかを判定するヘルパー関数
 */
export const isV2Reflection = (
  data: AIReflectionData
): data is AIReflectionDataV2 => {
  return 'schemaVersion' in data && data.schemaVersion === 2;
};

/**
 * V2リフレクションのセクション数を取得
 */
export const getV2SectionCount = (data: AIReflectionDataV2): number => {
  let count = 1; // understandingは必須
  if (data.perspective) count++;
  if (data.tomorrow) count++;
  return count;
};

/**
 * AIリフレクションの状態
 */
export type AIReflectionState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * AIリフレクションのエラー
 */
export interface AIReflectionError {
  code: string;
  message: string;
}
