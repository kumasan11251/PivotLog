import { useState, useEffect } from 'react';
import { loadUserSettings } from '../utils/storage';
import { calculateTimeLeft, calculateLifeProgress } from '../utils/timeCalculations';
import type { TimeLeft } from '../utils/timeCalculations';

interface UseTimeCalculationResult {
  timeLeft: TimeLeft;
  lifeProgress: number;
  targetLifespan: number;
}

/**
 * 残り時間と人生の進捗を計算するカスタムフック
 * 1秒ごとに自動更新される
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

  useEffect(() => {
    const updateTime = async () => {
      const settings = await loadUserSettings();
      if (!settings) return;

      setTargetLifespan(settings.targetLifespan);
      setTimeLeft(calculateTimeLeft(settings.birthday, settings.targetLifespan));
      setLifeProgress(calculateLifeProgress(settings.birthday, settings.targetLifespan));
    };

    // 初回計算
    updateTime();

    // 1秒ごとに更新
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return { timeLeft, lifeProgress, targetLifespan };
};
