/**
 * AIサービスの設定
 */

import Constants from 'expo-constants';

// AI プロバイダーの種類
// 'cloud-functions' を追加: Firebase Cloud Functions経由でAIを呼び出す（本番推奨）
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'cloud-functions' | 'mock';

// AI サービスの設定
export interface AIServiceConfig {
  /** 使用するAIプロバイダー */
  provider: AIProvider;
  /** OpenAI APIキー（ローカル開発用のみ） */
  openaiApiKey?: string;
  /** Anthropic APIキー（ローカル開発用のみ） */
  anthropicApiKey?: string;
  /** Google Gemini APIキー（ローカル開発用のみ） */
  geminiApiKey?: string;
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** リトライ回数 */
  maxRetries?: number;
}

/**
 * Cloud Functionsを使用するかどうかを判定
 * 本番環境では常にCloud Functionsを使用
 */
const shouldUseCloudFunctions = (): boolean => {
  const extra = Constants.expoConfig?.extra;

  // 明示的にCloud Functionsを使用する設定がある場合
  if (extra?.useCloudFunctions === true) {
    return true;
  }

  // 開発モードでない場合（本番）はCloud Functionsを使用
  if (!__DEV__) {
    return true;
  }

  // 開発モードで明示的にローカルAPIを使用する設定がある場合
  if (extra?.useLocalAI === true) {
    return false;
  }

  // デフォルト: 開発モードでもCloud Functionsを使用（安全なデフォルト）
  return true;
};

// 環境変数からGemini APIキーを取得（ローカル開発用）
const getGeminiApiKey = (): string | undefined => {
  // ⚠️ 本番環境ではCloud Functionsを使用するため、この関数は呼ばれません
  // ローカル開発用のみ

  // expo-constants経由で取得を試みる
  const extra = Constants.expoConfig?.extra;
  const envKey = extra?.geminiApiKey;

  return envKey;
};

// デフォルト設定
export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  provider: 'cloud-functions', // 本番ではCloud Functionsを使用
  timeout: 30000,   // 30秒
  maxRetries: 2,
};

/**
 * AI設定を取得
 *
 * 本番環境: Cloud Functions経由でGemini APIを呼び出し（APIキーはサーバーサイドで管理）
 * 開発環境: 設定に応じてCloud FunctionsまたはローカルAPIを使用
 */
export const getAIConfig = (): AIServiceConfig => {
  // Cloud Functionsを使用する場合
  if (shouldUseCloudFunctions()) {
    return {
      ...DEFAULT_AI_CONFIG,
      provider: 'cloud-functions',
    };
  }

  // ローカル開発用: 直接APIを呼び出す場合
  const geminiApiKey = getGeminiApiKey();

  if (geminiApiKey) {
    return {
      ...DEFAULT_AI_CONFIG,
      provider: 'gemini',
      geminiApiKey,
    };
  }

  // APIキーがない場合はモック
  return {
    ...DEFAULT_AI_CONFIG,
    provider: 'mock',
  };
};
