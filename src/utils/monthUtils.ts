/**
 * 月次インサイト関連のユーティリティ関数
 * 循環依存を避けるために、hooks と contexts から使用される共通関数をここに配置
 */

// 月次インサイト生成に必要な最低記録数（1ヶ月なので10日以上を要求）
export const MIN_ENTRIES_FOR_MONTHLY_INSIGHT = 10;

/**
 * 月情報の型定義
 */
export interface MonthInfo {
  /** 月キー (YYYY-MM形式) */
  monthKey: string;
  /** 月の開始日 (YYYY-MM-DD) */
  startDate: string;
  /** 月の終了日 (YYYY-MM-DD) */
  endDate: string;
  /** 年 */
  year: number;
  /** 月 (1-12) */
  month: number;
}

/**
 * 月キーを生成（YYYY-MM形式）
 */
export function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 月の開始日を取得
 */
export function getMonthStartDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 月の終了日を取得
 */
export function getMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 日付をYYYY-MM-DD形式の文字列に変換
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 月キーから月情報を計算
 */
export function getMonthInfoFromKey(monthKey: string): MonthInfo {
  // YYYY-MM形式をパース
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid month key format: ${monthKey}`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  // 月の開始日と終了日を計算
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 次月の0日 = 当月の末日

  return {
    monthKey,
    startDate: formatDateString(startDate),
    endDate: formatDateString(endDate),
    year,
    month,
  };
}

/**
 * 前の月のキーを取得
 */
export function getPreviousMonthKey(monthKey: string): string {
  const info = getMonthInfoFromKey(monthKey);
  const prevDate = new Date(info.year, info.month - 2, 1); // month - 1 - 1
  return getMonthKey(prevDate);
}

/**
 * 次の月のキーを取得
 */
export function getNextMonthKey(monthKey: string): string {
  const info = getMonthInfoFromKey(monthKey);
  const nextDate = new Date(info.year, info.month, 1); // month - 1 + 1 = month
  return getMonthKey(nextDate);
}

/**
 * 月キーが今月より前かどうかを判定
 */
export function isMonthBeforeCurrent(monthKey: string): boolean {
  const currentMonthKey = getMonthKey(new Date());
  return monthKey < currentMonthKey;
}

/**
 * 月キーが先月かどうかを判定
 */
export function isLastMonth(monthKey: string): boolean {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonth);
  return monthKey === lastMonthKey;
}

/**
 * 月キーが今月かどうかを判定
 */
export function isCurrentMonth(monthKey: string): boolean {
  const currentMonthKey = getMonthKey(new Date());
  return monthKey === currentMonthKey;
}

/**
 * 月名を日本語で取得（例: 1月、12月）
 */
export function getMonthDisplayName(monthKey: string): string {
  const info = getMonthInfoFromKey(monthKey);
  return `${info.month}月`;
}

/**
 * 月の表示用文字列を取得（例: 2026年1月）
 */
export function getMonthDisplayFull(monthKey: string): string {
  const info = getMonthInfoFromKey(monthKey);
  return `${info.year}年${info.month}月`;
}

/**
 * 月の日数を取得
 */
export function getDaysInMonth(monthKey: string): number {
  const info = getMonthInfoFromKey(monthKey);
  return new Date(info.year, info.month, 0).getDate();
}

/**
 * 先月の月キーを取得
 */
export function getLastMonthKey(): string {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return getMonthKey(lastMonth);
}
