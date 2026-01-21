/**
 * Firebase Cloud Functions クライアント
 *
 * Cloud Functions のエンドポイントを呼び出すためのユーティリティ
 */

import functions from '@react-native-firebase/functions';

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
}

/**
 * AIリフレクション生成レスポンスの型
 */
export interface ReflectionResponse {
  content: string;
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

    // Firebase Functions エラーの詳細を取得
    if (error && typeof error === 'object' && 'code' in error) {
      const functionsError = error as { code: string; message: string };
      throw new Error(`Cloud Functions error: ${functionsError.code} - ${functionsError.message}`);
    }

    throw error;
  }
}
