/**
 * AI生成コンテンツのレポート機能の型定義
 */

/** レポートの種類 */
export type AIReportType = 'inappropriate' | 'inaccurate' | 'harmful' | 'other';

/** レポートの状態 */
export type AIReportStatus = 'pending' | 'reviewed' | 'resolved';

/** AIコンテンツレポート */
export interface AIContentReport {
  /** レポートID（自動生成） */
  id: string;
  /** ユーザーID */
  userId: string;
  /** 対象の日記日付 */
  diaryDate: string;
  /** レポート送信日時（ISO 8601） */
  reportedAt: string;
  /** レポートの種類 */
  reportType: AIReportType;
  /** 詳細説明（任意） */
  reportDetail?: string;
  /** 報告対象のリフレクション内容 */
  reflectionContent: {
    understanding?: string;
    perspective?: string;
    tomorrow?: string;
  };
  /** レポートの状態 */
  status: AIReportStatus;
}

/** レポート作成時の入力データ */
export interface CreateAIReportInput {
  diaryDate: string;
  reportType: AIReportType;
  reportDetail?: string;
  reflectionContent: {
    understanding?: string;
    perspective?: string;
    tomorrow?: string;
  };
}
