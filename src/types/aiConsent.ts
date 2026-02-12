/**
 * AI機能の同意状態を管理する型定義
 */

/** 同意状態 */
export interface AIConsentStatus {
  /** 同意済みかどうか */
  hasConsented: boolean;
  /** 同意日時（ISO 8601） */
  consentedAt?: string;
  /** 同意したプライバシーポリシーのバージョン */
  version: number;
}

/** 現在の同意バージョン（プライバシーポリシー更新時にインクリメント） */
export const CURRENT_CONSENT_VERSION = 1;
