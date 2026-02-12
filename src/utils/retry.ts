/**
 * リトライユーティリティ
 * 一時的なエラーに対する指数バックオフ付きリトライ機能を提供
 */

/** リトライ対象の一時的エラーコード */
const TRANSIENT_ERROR_CODES = [
  'firestore/unavailable',
  'firestore/network-request-failed',
  'firestore/deadline-exceeded',
  'firestore/resource-exhausted',
  'firestore/aborted',
] as const;

/** リトライ設定 */
export interface RetryOptions {
  /** 最大リトライ回数（デフォルト: 3） */
  maxRetries?: number;
  /** 基本待機時間（ミリ秒、デフォルト: 1000） */
  baseDelayMs?: number;
  /** リトライ時のコールバック */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * エラーがリトライ可能な一時的エラーかどうかを判定
 */
export const isTransientError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  // Firebase error codeをチェック
  const errorCode = (error as { code?: string }).code;
  if (errorCode) {
    if (TRANSIENT_ERROR_CODES.some((code) => errorCode.includes(code))) {
      return true;
    }
  }

  // エラーメッセージのパターンマッチング
  const errorMessage = (error as { message?: string }).message;
  if (errorMessage) {
    const transientPatterns = [
      'unavailable',
      'network',
      'timeout',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
    ];
    return transientPatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return false;
};

/**
 * 指数バックオフ付きリトライを実行
 *
 * @param operation - 実行する非同期処理
 * @param options - リトライ設定
 * @returns 処理結果
 * @throws 一時的エラーでない場合、またはすべてのリトライが失敗した場合にスロー
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 一時的エラーでない場合は即座にスロー
      if (!isTransientError(error)) {
        throw lastError;
      }

      onRetry?.(attempt, lastError);

      // 最後の試行でなければ指数バックオフで待機
      if (attempt < maxRetries) {
        const delay = baseDelayMs * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retries failed');
};
