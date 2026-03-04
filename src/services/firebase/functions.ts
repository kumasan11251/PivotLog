/**
 * Firebase Cloud Functions クライアント
 *
 * Cloud Functions のエンドポイントを呼び出すためのユーティリティ
 */

import functions from '@react-native-firebase/functions';
import type { MonthlyThemeType } from '../../types/monthlyInsight';

/**
 * サポートするAIモデルの型
 */
export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

/**
 * 直近の日記エントリ（リクエスト用）
 */
export interface RecentDiaryEntry {
  date: string;
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
}

/**
 * AIリフレクション生成リクエストの型
 */
export interface GenerateReflectionRequest {
  goodTime: string;
  wastedTime: string;
  tomorrow: string;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  /** 日記の日付（YYYY-MM-DD形式）- 利用制限チェック用 */
  diaryDate?: string;
  /** 直近の日記データ（Phase 2で追加） */
  recentEntries?: RecentDiaryEntry[];
}

/**
 * AIリフレクション生成レスポンスの型
 * V1形式とV2形式の両方をサポート
 */
export interface ReflectionResponse {
  // V1形式（後方互換）
  content?: string;
  question?: string;
  // V2形式（動的セクション）
  understanding?: string;
  perspective?: string;
  tomorrow?: string;
  schemaVersion?: 1 | 2;
  // 共通フィールド
  generatedAt: string;
  modelVersion: string;
  // V1拡張フィールド（Phase 1で追加）
  emotionInsight?: {
    detected: string;
    depth: string;
  };
  lifeContext?: {
    perspective: string;
  };
  actionSuggestion?: {
    micro: string;
    reason: string;
  };
  // V1拡張フィールド（Phase 2で追加）
  continuity?: {
    connectionToPast?: {
      referenceDate: string;
      connection: string;
    };
    growthObservation?: {
      observation: string;
    };
  };
}

/**
 * 週次インサイト生成リクエストの型
 */
export interface GenerateWeeklyInsightRequest {
  entries: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  weekStartDate: string;
  weekEndDate: string;
}

/**
 * 週次インサイト生成レスポンスの型
 */
export interface WeeklyInsightResponse {
  summary: string;
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
    frequency?: number;
  }>;
  question: string;
  generatedAt: string;
  modelVersion: string;
}

/**
 * Cloud Functions経由でAIリフレクションを生成
 *
 * @param request - リフレクション生成リクエスト
 * @returns リフレクションレスポンス
 * @throws エラー時は例外をスロー
 */
export async function generateReflectionViaCloudFunctions(
  request: GenerateReflectionRequest
): Promise<ReflectionResponse> {
  try {
    // 東京リージョンのFunctionを呼び出す
    const generateReflection = functions()
      .app.functions('asia-northeast1')
      .httpsCallable('generateReflection');

    const result = await generateReflection(request);
    return result.data as ReflectionResponse;
  } catch (error: unknown) {
    console.error('[CloudFunctions] generateReflection error:', error);
    // Firebase callable エラーの code/message/details を保持したまま伝播
    throw error;
  }
}

/**
 * Cloud Functions経由で週次インサイトを生成
 *
 * @param request - 週次インサイト生成リクエスト
 * @returns 週次インサイトレスポンス
 * @throws エラー時は例外をスロー
 */
export async function generateWeeklyInsightViaCloudFunctions(
  request: GenerateWeeklyInsightRequest
): Promise<WeeklyInsightResponse> {
  try {
    // 東京リージョンのFunctionを呼び出す
    const generateWeeklyInsight = functions()
      .app.functions('asia-northeast1')
      .httpsCallable('generateWeeklyInsight');

    const result = await generateWeeklyInsight(request);
    return result.data as WeeklyInsightResponse;
  } catch (error: unknown) {
    console.error('[CloudFunctions] generateWeeklyInsight error:', error);

    // Firebase Functions エラーの詳細を取得
    if (error && typeof error === 'object' && 'code' in error) {
      const functionsError = error as { code: string; message: string };
      throw new Error(`Cloud Functions error: ${functionsError.code} - ${functionsError.message}`);
    }

    throw error;
  }
}

/**
 * 週次インサイトV2生成レスポンスの型
 */
export interface WeeklyInsightV2Response {
  intentionToAction: {
    achieved: Array<{
      intentionDate: string;
      intention: string;
      achievedDate: string;
      achievement: string;
    }>;
    successAnalysis: string;
    celebration: string;
  };
  patterns: Array<{
    type: string;
    title: string;
    description: string;
    examples: Array<{ date: string; quote: string }>;
    insight: string;
  }>;
  actionSuggestion: {
    mainSuggestion: {
      action: string;
      reason: string;
      suggestedTiming: string;
    };
    keepDoing?: string;
  };
  generatedAt: string;
  modelVersion: string;
  schemaVersion: 2;
}

/**
 * Cloud Functions経由で週次インサイトV2を生成
 *
 * @param request - 週次インサイト生成リクエスト
 * @returns 週次インサイトV2レスポンス
 * @throws エラー時は例外をスロー
 */
export async function generateWeeklyInsightV2ViaCloudFunctions(
  request: GenerateWeeklyInsightRequest
): Promise<WeeklyInsightV2Response> {
  try {
    // 東京リージョンのFunctionを呼び出す
    const generateWeeklyInsightV2 = functions()
      .app.functions('asia-northeast1')
      .httpsCallable('generateWeeklyInsightV2');

    const result = await generateWeeklyInsightV2(request);
    return result.data as WeeklyInsightV2Response;
  } catch (error: unknown) {
    console.error('[CloudFunctions] generateWeeklyInsightV2 error:', error);

    // Firebase Functions エラーの詳細を取得
    if (error && typeof error === 'object' && 'code' in error) {
      const functionsError = error as { code: string; message: string };
      throw new Error(`Cloud Functions error: ${functionsError.code} - ${functionsError.message}`);
    }

    throw error;
  }
}

/**
 * 月次インサイト生成リクエストの型
 */
export interface GenerateMonthlyInsightRequest {
  entries: Array<{
    date: string;
    goodTime: string;
    wastedTime: string;
    tomorrow: string;
  }>;
  currentAge: number;
  remainingYears: number;
  remainingDays: number;
  monthStartDate: string;
  monthEndDate: string;
  yearMonth: string;
}

/**
 * ストーリーラインのムード型
 */
type StorylineMood = 'busy' | 'peaceful' | 'challenging' | 'growing' | 'joyful' | 'reflective';

/**
 * 月次インサイト生成レスポンスの型（新構造・3時期・パーセンテージなし）
 */
export interface MonthlyInsightResponse {
  // 新セクション
  lifeContextSummary: string;
  storyline: {
    beginning: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
    middle: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
    end: {
      period: string;
      summary: string;
      keyQuote?: string;
      mood: StorylineMood;
    };
  };
  valueDiscovery: {
    primaryValue: {
      name: string;
      evidence: string[];
      insight: string;
    };
    secondaryValues: Array<{
      name: string;
      briefEvidence: string;
    }>;
    hiddenInsight: string;
  };
  highlights: Array<{
    date: string;
    type: 'achievement' | 'connection' | 'discovery' | 'turning_point';
    title: string;
    description: string;
    quote?: string;
  }>;
  letterToFutureSelf: string;
  growth: {
    improvements: string[];
    challenges: string[];
    transformation?: string;
  };
  question: string;
  generatedAt: string;
  modelVersion: string;
  // 後方互換性
  summary?: string;
  themes?: Array<{
    type: MonthlyThemeType;
    title: string;
    description: string;
    examples?: Array<{ date: string; quote: string }>;
  }>;
}

/**
 * Cloud Functions経由で月次インサイトを生成
 *
 * @param request - 月次インサイト生成リクエスト
 * @returns 月次インサイトレスポンス
 * @throws エラー時は例外をスロー
 */
export async function generateMonthlyInsightViaCloudFunctions(
  request: GenerateMonthlyInsightRequest
): Promise<MonthlyInsightResponse> {
  try {
    // 東京リージョンのFunctionを呼び出す
    const generateMonthlyInsight = functions()
      .app.functions('asia-northeast1')
      .httpsCallable('generateMonthlyInsight');

    const result = await generateMonthlyInsight(request);
    return result.data as MonthlyInsightResponse;
  } catch (error: unknown) {
    console.error('[CloudFunctions] generateMonthlyInsight error:', error);

    // Firebase Functions エラーの詳細を取得
    if (error && typeof error === 'object' && 'code' in error) {
      const functionsError = error as { code: string; message: string };
      throw new Error(`Cloud Functions error: ${functionsError.code} - ${functionsError.message}`);
    }

    throw error;
  }
}
