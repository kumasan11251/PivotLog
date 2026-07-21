import { useState, useEffect } from 'react';
import { getDiaryByDate, DiaryEntry } from '../utils/storage';
import { addDaysToDateString, formatDateToString } from '../utils/dateUtils';

export type TimeHopDistance = 'week' | 'month' | 'year';

export interface TimeHop {
  /** どれだけ昔の記録か */
  distance: TimeHopDistance;
  /** 過去エントリの日付（YYYY-MM-DD） */
  dateString: string;
  /** 過去の日記エントリ */
  entry: DiaryEntry;
}

/**
 * 1ヶ月前の同日を計算する（存在しない日は月末に丸め）
 * タイムゾーン問題を避けるためコンポーネント分解してパースする
 */
const getMonthBefore = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  // new Date(year, month - 1, 0) は前月の末日
  const lastDayOfPrevMonth = new Date(year, month - 1, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfPrevMonth);
  return formatDateToString(new Date(year, month - 2, clampedDay, 0, 0, 0, 0));
};

/**
 * 1年前の同日を計算する（うるう日など存在しない日は月末に丸め）
 */
const getYearBefore = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  // new Date(year - 1, month, 0) は前年同月の末日
  const lastDayOfMonth = new Date(year - 1, month, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfMonth);
  return formatDateToString(new Date(year - 1, month - 1, clampedDay, 0, 0, 0, 0));
};

/**
 * 表示中の日付から「あの日の自分」（1週間前・1ヶ月前・1年前の同日の日記）を取得するフック。
 *
 * - 最も古いもの1件を優先して返す（1年前 > 1ヶ月前 > 1週間前）。再会価値が高い順
 * - 過去のネガティブを突きつけない配慮として、goodTime / tomorrow のどちらかが
 *   書かれているエントリのみ対象にする（wastedTime しか無い日はスキップ）
 * - 該当なし / 取得失敗 / ローディング中は null を返し、画面側では黙って非表示にする
 *
 * @param dateString 表示中の日付（YYYY-MM-DD）
 */
export const useTimeHop = (dateString: string): TimeHop | null => {
  const [timeHop, setTimeHop] = useState<TimeHop | null>(null);

  useEffect(() => {
    let cancelled = false;

    const targets: { distance: TimeHopDistance; date: string }[] = [
      { distance: 'year', date: getYearBefore(dateString) },
      { distance: 'month', date: getMonthBefore(dateString) },
      { distance: 'week', date: addDaysToDateString(dateString, -7) },
    ];

    (async () => {
      try {
        const entries = await Promise.all(targets.map((t) => getDiaryByDate(t.date)));
        if (cancelled) return;

        for (let i = 0; i < targets.length; i++) {
          const entry = entries[i];
          if (entry && (entry.goodTime?.trim() || entry.tomorrow?.trim())) {
            setTimeHop({ distance: targets[i].distance, dateString: targets[i].date, entry });
            return;
          }
        }
        setTimeHop(null);
      } catch (error) {
        if (cancelled) return;
        console.error('あの日の自分の取得に失敗しました', error);
        setTimeHop(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateString]);

  return timeHop;
};
