import { useState, useEffect, useCallback } from 'react';
import { loadHomeDisplaySettings, saveHomeDisplaySettings } from '../utils/storage';

export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly' | 'seasons';
export type ProgressMode = 'bar' | 'circle' | 'grid';

interface UseDisplaySettingsResult {
  countdownMode: CountdownMode;
  progressMode: ProgressMode;
  isLoading: boolean;
  toggleCountdownMode: () => Promise<void>;
  toggleProgressMode: () => Promise<void>;
  setCountdownMode: (mode: CountdownMode) => Promise<void>;
}

/**
 * ホーム画面の表示設定を管理するカスタムフック
 */
export const useDisplaySettings = (): UseDisplaySettingsResult => {
  const [countdownMode, setCountdownModeState] = useState<CountdownMode>('detailed');
  const [progressMode, setProgressMode] = useState<ProgressMode>('bar');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadHomeDisplaySettings();
      if (settings) {
        setCountdownModeState(settings.countdownMode);
        setProgressMode(settings.progressMode);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const toggleCountdownMode = useCallback(async () => {
    // 左から右に進む順番: detailed → yearsOnly → weeksOnly → daysOnly → seasons
    const newMode =
      countdownMode === 'detailed' ? 'yearsOnly' :
      countdownMode === 'yearsOnly' ? 'weeksOnly' :
      countdownMode === 'weeksOnly' ? 'daysOnly' :
      countdownMode === 'daysOnly' ? 'seasons' :
      'detailed';

    setCountdownModeState(newMode);
    await saveHomeDisplaySettings({
      countdownMode: newMode,
      progressMode,
    });
  }, [countdownMode, progressMode]);

  const setCountdownMode = useCallback(async (mode: CountdownMode) => {
    setCountdownModeState(mode);
    await saveHomeDisplaySettings({
      countdownMode: mode,
      progressMode,
    });
  }, [progressMode]);

  const toggleProgressMode = useCallback(async () => {
    const newMode = progressMode === 'bar' ? 'circle' : progressMode === 'circle' ? 'grid' : 'bar';
    setProgressMode(newMode);
    await saveHomeDisplaySettings({
      countdownMode,
      progressMode: newMode,
    });
  }, [countdownMode, progressMode]);

  return {
    countdownMode,
    progressMode,
    isLoading,
    toggleCountdownMode,
    toggleProgressMode,
    setCountdownMode,
  };
};
