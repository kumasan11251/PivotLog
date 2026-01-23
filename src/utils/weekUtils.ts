/**
 * 週次インサイト関連のユーティリティ関数
 * 循環依存を避けるために、hooks/useWeeklyInsight.ts と contexts/WeeklyInsightContext.tsx から使用される共通関数をここに配置
 */

// 週次インサイト生成に必要な最低記録数
export const MIN_ENTRIES_FOR_INSIGHT = 3;

/**
 * ISO週番号を計算する（ISO 8601準拠）
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 週キーを生成（YYYY-Www形式）
 */
export function getWeekKey(date: Date): string {
  const weekNum = getISOWeekNumber(date);
  // ISO週の年を計算（年末年始で異なる場合がある）
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * 週の開始日（月曜日）を取得
 */
export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日に調整
  return new Date(d.setDate(diff));
}

/**
 * 週の終了日（日曜日）を取得
 */
export function getWeekEndDate(date: Date): Date {
  const start = getWeekStartDate(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
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
 * 週情報の型定義
 */
export interface WeekInfo {
  weekKey: string;
  startDate: string;
  endDate: string;
  weekNumber: number;
  year: number;
}

/**
 * 週キーから週情報を計算
 */
export function getWeekInfoFromKey(weekKey: string): WeekInfo {
  // YYYY-Www形式をパース
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid week key format: ${weekKey}`);
  }

  const year = parseInt(match[1], 10);
  const weekNumber = parseInt(match[2], 10);

  // ISO週の最初の日（月曜日）を計算
  // 1月4日は常にISO週1に含まれる
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);

  // 指定された週の月曜日を計算
  const targetMonday = new Date(firstMonday);
  targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);

  return {
    weekKey,
    startDate: formatDateString(targetMonday),
    endDate: formatDateString(targetSunday),
    weekNumber,
    year,
  };
}

/**
 * 前の週のキーを取得
 */
export function getPreviousWeekKey(weekKey: string): string {
  const info = getWeekInfoFromKey(weekKey);
  const [year, month, day] = info.startDate.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setDate(startDate.getDate() - 7);
  return getWeekKey(startDate);
}

/**
 * 次の週のキーを取得
 */
export function getNextWeekKey(weekKey: string): string {
  const info = getWeekInfoFromKey(weekKey);
  const [year, month, day] = info.startDate.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setDate(startDate.getDate() + 7);
  return getWeekKey(startDate);
}

/**
 * 週キーが今週より前かどうかを判定
 */
export function isWeekBeforeCurrent(weekKey: string): boolean {
  const currentWeekKey = getWeekKey(new Date());
  return weekKey < currentWeekKey;
}

/**
 * 週キーが先週かどうかを判定
 */
export function isLastWeek(weekKey: string): boolean {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastWeekKey = getWeekKey(lastWeek);
  return weekKey === lastWeekKey;
}
