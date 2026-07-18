import { useState, useEffect, useCallback } from 'react';
import { loadHomeDisplaySettings, saveHomeDisplaySettings } from '../utils/storage';
import { syncWidgetData } from '../utils/widgetStorage';

export type CountdownMode = 'detailed' | 'daysOnly' | 'weeksOnly' | 'yearsOnly';
export type ProgressMode = 'bar' | 'circle' | 'grid';

interface UseDisplaySettingsResult {
  countdownMode: CountdownMode;
  progressMode: ProgressMode;
  seasonalBackdropEnabled: boolean;
  isLoading: boolean;
  toggleCountdownMode: () => Promise<void>;
  toggleProgressMode: () => Promise<void>;
  setCountdownMode: (mode: CountdownMode) => Promise<void>;
  setSeasonalBackdropEnabled: (enabled: boolean) => Promise<void>;
  refreshDisplaySettings: () => Promise<void>;
}

/**
 * ホーム画面の表示設定を管理するカスタムフック
 */
export const useDisplaySettings = (): UseDisplaySettingsResult => {
  const [countdownMode, setCountdownModeState] = useState<CountdownMode>('detailed');
  const [progressMode, setProgressMode] = useState<ProgressMode>('bar');
  const [seasonalBackdropEnabled, setSeasonalBackdropEnabledState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDisplaySettings = useCallback(async () => {
    const settings = await loadHomeDisplaySettings();
    if (settings) {
      // 既存ユーザーが'seasons'を設定していた場合のフォールバック
      const validMode = settings.countdownMode === ('seasons' as string) ? 'detailed' : settings.countdownMode;
      setCountdownModeState(validMode as CountdownMode);
      setProgressMode(settings.progressMode);
      setSeasonalBackdropEnabledState(settings.seasonalBackdropEnabled ?? true);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      await refreshDisplaySettings();
      setIsLoading(false);
    };
    loadSettings();
  }, [refreshDisplaySettings]);

  const toggleCountdownMode = useCallback(async () => {
    // 左から右に進む順番: detailed → yearsOnly → weeksOnly → daysOnly → detailed
    const newMode =
      countdownMode === 'detailed' ? 'yearsOnly' :
      countdownMode === 'yearsOnly' ? 'weeksOnly' :
      countdownMode === 'weeksOnly' ? 'daysOnly' :
      'detailed';

    setCountdownModeState(newMode);
    await saveHomeDisplaySettings({
      countdownMode: newMode,
      progressMode,
      seasonalBackdropEnabled,
    });

    // ウィジェットが「ホーム連動」モードの場合に反映されるよう同期
    try {
      await syncWidgetData();
    } catch (error) {
      console.error('[useDisplaySettings] ウィジェット同期エラー:', error);
    }
  }, [countdownMode, progressMode, seasonalBackdropEnabled]);

  const setCountdownMode = useCallback(async (mode: CountdownMode) => {
    setCountdownModeState(mode);
    await saveHomeDisplaySettings({
      countdownMode: mode,
      progressMode,
      seasonalBackdropEnabled,
    });

    // ウィジェットが「ホーム連動」モードの場合に反映されるよう同期
    try {
      await syncWidgetData();
    } catch (error) {
      console.error('[useDisplaySettings] ウィジェット同期エラー:', error);
    }
  }, [progressMode, seasonalBackdropEnabled]);

  const toggleProgressMode = useCallback(async () => {
    // bar → circle → grid → bar
    const newMode =
      progressMode === 'bar' ? 'circle' :
      progressMode === 'circle' ? 'grid' :
      'bar';
    setProgressMode(newMode);
    await saveHomeDisplaySettings({
      countdownMode,
      progressMode: newMode,
      seasonalBackdropEnabled,
    });
  }, [countdownMode, progressMode, seasonalBackdropEnabled]);

  const setSeasonalBackdropEnabled = useCallback(async (enabled: boolean) => {
    setSeasonalBackdropEnabledState(enabled);
    await saveHomeDisplaySettings({
      countdownMode,
      progressMode,
      seasonalBackdropEnabled: enabled,
    });
  }, [countdownMode, progressMode]);

  return {
    countdownMode,
    progressMode,
    seasonalBackdropEnabled,
    isLoading,
    toggleCountdownMode,
    toggleProgressMode,
    setCountdownMode,
    setSeasonalBackdropEnabled,
    refreshDisplaySettings,
  };
};
