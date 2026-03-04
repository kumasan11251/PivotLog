import type { InsightHistoryItem } from '../types/insightHistory';
import type { WeeklyInsightDocument, MonthlyInsightDocument } from '../services/firebase/firestore';
import { getMonthDisplayFull } from './monthUtils';

/**
 * 週キーをパースして年と週番号を返す
 */
function formatWeekKey(weekKey: string): { year: number; weekNumber: number } {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    return { year: 0, weekNumber: 0 };
  }
  return {
    year: parseInt(match[1], 10),
    weekNumber: parseInt(match[2], 10),
  };
}

/**
 * 日付範囲を短い形式で表示
 */
function formatDateRangeShort(startDate: string, endDate: string): string {
  const [, startMonth, startDay] = startDate.split('-').map(Number);
  const [, endMonth, endDay] = endDate.split('-').map(Number);
  return `${startMonth}/${startDay} 〜 ${endMonth}/${endDay}`;
}

/**
 * WeeklyInsightDocument → InsightHistoryItem 変換
 */
export function weeklyToHistoryItem(doc: WeeklyInsightDocument): InsightHistoryItem {
  const { year, weekNumber } = formatWeekKey(doc.weekKey);
  return {
    key: doc.weekKey,
    title: `${year}年 第${weekNumber}週`,
    dateRange: formatDateRangeShort(doc.weekStartDate, doc.weekEndDate),
    summary: doc.summary,
    entryCount: doc.entryCount,
    tags: doc.patterns.length > 0
      ? doc.patterns.map((p) => ({ title: p.title }))
      : undefined,
    iconName: 'analytics',
  };
}

/**
 * MonthlyInsightDocument → InsightHistoryItem 変換
 */
export function monthlyToHistoryItem(doc: MonthlyInsightDocument): InsightHistoryItem {
  return {
    key: doc.monthKey,
    title: getMonthDisplayFull(doc.monthKey),
    dateRange: undefined,
    summary: doc.lifeContextSummary ?? doc.summary,
    entryCount: doc.entryCount,
    tags: undefined,
    iconName: 'calendar',
  };
}
