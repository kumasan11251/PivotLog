import { useState, useEffect, useRef } from 'react';
import { getRecentDiaryEntries } from '../utils/storage';

/**
 * 選択中の日付の「前日」に書かれた「明日、大切にしたいこと」(tomorrow)を取得するフック。
 *
 * - getRecentDiaryEntries(dateString, 1) を呼ぶと startDate === endDate === 前日 となるため、
 *   前日ちょうど1件が返る（既存関数の再利用。新規の日付計算は不要）
 * - 前日エントリが無い / tomorrow が空 / 取得失敗 / ローディング中はすべて null を返し、
 *   画面側では黙って非表示にできるようにする
 *
 * @param dateString 選択中の日付（YYYY-MM-DD）
 * @returns 前日の tomorrow（非空文字列）または null
 */
export const usePreviousDayFocus = (
  dateString: string,
  initialPreviousFocus?: string | null,
  onPreviousFocusChange?: (previousFocus: string | null) => void
): string | null => {
  const [previousFocus, setPreviousFocus] = useState<string | null>(initialPreviousFocus ?? null);
  const initializedFromCacheRef = useRef(initialPreviousFocus !== undefined);
  const onPreviousFocusChangeRef = useRef(onPreviousFocusChange);

  useEffect(() => {
    onPreviousFocusChangeRef.current = onPreviousFocusChange;
  }, [onPreviousFocusChange]);

  useEffect(() => {
    // Pagerの中央ページ再生成時は、読み込み済みの値をそのまま引き継ぐ。
    if (initializedFromCacheRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const entries = await getRecentDiaryEntries(dateString, 1);
        if (cancelled) return;

        const tomorrow = entries[0]?.tomorrow?.trim();
        const nextPreviousFocus = tomorrow ? tomorrow : null;
        setPreviousFocus(nextPreviousFocus);
        onPreviousFocusChangeRef.current?.(nextPreviousFocus);
      } catch (error) {
        if (cancelled) return;
        console.error('前日の大切にしたいことの取得に失敗しました', error);
        setPreviousFocus(null);
        onPreviousFocusChangeRef.current?.(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dateString]);

  return previousFocus;
};
