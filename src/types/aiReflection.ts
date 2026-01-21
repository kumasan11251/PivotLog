/**
 * AIリフレクション関連の型定義
 */

/**
 * AIリフレクションのデータ構造
 */
export interface AIReflectionData {
  /** AIからのメッセージ本文 */
  content: string;
  /** 問いかけ部分 */
  question: string;
  /** 生成日時 (ISO 8601) */
  generatedAt: string;
  /** 使用したモデルバージョン（デバッグ用） */
  modelVersion?: string;
}

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
