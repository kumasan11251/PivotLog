import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { loadUserSettings } from '../utils/storage';
import { calculateTimeLeft, calculateLifeProgress } from '../utils/timeCalculations';
import type { TimeLeft } from '../utils/timeCalculations';

interface UseTimeCalculationResult {
  timeLeft: TimeLeft;
  lifeProgress: number;
  targetLifespan: number;
  birthday: string | null;
}

/**
 * 残り時間と人生の進捗を計算するカスタムフック
 * 1秒ごとに自動更新され、画面フォーカス時に設定を再読み込み
 */
export const useTimeCalculation = (): UseTimeCalculationResult => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
    totalWeeks: 0,
    totalYears: 0,
  });
  const [lifeProgress, setLifeProgress] = useState(0);
  const [targetLifespan, setTargetLifespan] = useState(0);
  const [birthday, setBirthday] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTime = useCallback(async () => {
    const settings = await loadUserSettings();
    if (!settings) return;

    setBirthday(settings.birthday);
    setTargetLifespan(settings.targetLifespan);
    setTimeLeft(calculateTimeLeft(settings.birthday, settings.targetLifespan));
    setLifeProgress(calculateLifeProgress(settings.birthday, settings.targetLifespan));
  }, []);

  // 画面がフォーカスされるたびに設定を再読み込みし、インターバルを再設定
  useFocusEffect(
    useCallback(() => {
      // 即座に更新
      updateTime();

      // 1秒ごとに更新
      intervalRef.current = setInterval(updateTime, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [updateTime])
  );

  return { timeLeft, lifeProgress, targetLifespan, birthday };
};
